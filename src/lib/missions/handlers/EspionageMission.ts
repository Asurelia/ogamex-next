/**
 * EspionageMission Handler
 *
 * Handles espionage missions (mission type 6) against enemy planets.
 *
 * Espionage Rules (OGame-compatible):
 * 1. Information revealed depends on espionage tech difference:
 *    - Any: Resources (always visible)
 *    - +1: Fleet composition
 *    - +3: Defense structures
 *    - +5: Building levels
 *    - +7: Research levels
 *
 * 2. More probes = more info but higher detection risk
 *
 * 3. Counter-espionage:
 *    - Chance = (defTech - attTech) * probeCount * 0.02
 *    - If detected, probes can be destroyed
 *
 * 4. Probes have minimal combat stats (attack: 0.01, shield: 0.01, hull: 1000)
 */

import type { MissionType, Planet, UserResearch } from '@/types/database'
import { BaseMission } from '../BaseMission'
import {
  MissionContext,
  MissionArrivalResult,
  MissionReturnResult,
  Resources,
  ShipCounts,
  emptyResources,
  emptyShipCounts,
  SHIP_KEYS,
} from '../types'
import {
  InfoLevel,
  EspionageReport,
  CounterEspionageResult,
  INFO_LEVEL_THRESHOLDS,
  COUNTER_ESPIONAGE_BASE_FACTOR,
  PROBE_INFO_BONUS,
} from '../../espionage/types'

// ============================================================================
// BUILDING KEYS FOR REPORT EXTRACTION
// ============================================================================

const BUILDING_KEYS = [
  'metal_mine',
  'crystal_mine',
  'deuterium_synthesizer',
  'solar_plant',
  'fusion_plant',
  'metal_storage',
  'crystal_storage',
  'deuterium_tank',
  'robot_factory',
  'nanite_factory',
  'shipyard',
  'research_lab',
  'terraformer',
  'alliance_depot',
  'missile_silo',
  'space_dock',
  'lunar_base',
  'sensor_phalanx',
  'jump_gate',
] as const

const DEFENSE_KEYS = [
  'rocket_launcher',
  'light_laser',
  'heavy_laser',
  'gauss_cannon',
  'ion_cannon',
  'plasma_turret',
  'small_shield_dome',
  'large_shield_dome',
  'anti_ballistic_missile',
  'interplanetary_missile',
] as const

const FLEET_KEYS = [
  'light_fighter',
  'heavy_fighter',
  'cruiser',
  'battleship',
  'battlecruiser',
  'bomber',
  'destroyer',
  'deathstar',
  'small_cargo',
  'large_cargo',
  'colony_ship',
  'recycler',
  'espionage_probe',
  'solar_satellite',
  'crawler',
  'reaper',
  'pathfinder',
] as const

const RESEARCH_KEYS = [
  'energy_technology',
  'laser_technology',
  'ion_technology',
  'hyperspace_technology',
  'plasma_technology',
  'combustion_drive',
  'impulse_drive',
  'hyperspace_drive',
  'espionage_technology',
  'computer_technology',
  'astrophysics',
  'intergalactic_research_network',
  'graviton_technology',
  'weapons_technology',
  'shielding_technology',
  'armor_technology',
] as const

export class EspionageMission extends BaseMission {
  readonly missionType: MissionType = 'espionage'
  readonly hasReturn: boolean = true
  readonly name: string = 'Espionage'

  /**
   * Process espionage mission arrival at target
   *
   * 1. Calculate info level based on tech difference
   * 2. Check for counter-espionage detection
   * 3. Generate espionage report
   * 4. Send messages to both players
   * 5. Return surviving probes
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission, targetPlanet, attackerResearch, defenderResearch } = context

    // Target planet must exist
    if (!targetPlanet) {
      const ships = this.getShips(mission)
      const resources = this.getResources(mission)

      const message = this.createMessage(
        mission.user_id,
        'espionage',
        'Espionage Mission Failed',
        `Your espionage probes arrived at ${this.formatCoords(
          mission.destination_galaxy,
          mission.destination_system,
          mission.destination_position
        )} but found no planet. The fleet is returning.`
      )

      return this.successArrival(true, resources, ships, [message], [])
    }

    // Cannot spy on own planets
    if (targetPlanet.user_id === mission.user_id) {
      return this.errorArrival('Cannot spy on your own planet')
    }

    // Get probe count from mission
    const probeCount = mission.espionage_probe || 0
    if (probeCount === 0) {
      return this.errorArrival('No espionage probes in mission')
    }

    // Get espionage technology levels
    const attackerTech = attackerResearch?.espionage_technology || 0
    const defenderTech = defenderResearch?.espionage_technology || 0

    // Calculate information level
    const infoLevel = this.calculateInfoLevel(attackerTech, defenderTech, probeCount)

    // Check for counter-espionage
    const counterEspionage = this.checkCounterEspionage(attackerTech, defenderTech, probeCount)

    // Generate espionage report
    const report = this.generateReport(
      targetPlanet,
      defenderResearch,
      infoLevel,
      probeCount,
      counterEspionage
    )

    // Save report to database
    await this.saveEspionageReport(mission.user_id, report)

    // Calculate surviving probes
    const survivingProbes = Math.max(0, probeCount - counterEspionage.probesLost)
    const returnShips = emptyShipCounts()
    returnShips.espionage_probe = survivingProbes

    // Create messages
    const messages = this.createEspionageMessages(
      mission,
      targetPlanet,
      report,
      counterEspionage
    )

    // Return with surviving probes and any carried resources
    const resources = this.getResources(mission)

    return this.successArrival(
      true,
      resources,
      returnShips,
      messages,
      []
    )
  }

  /**
   * Process espionage mission return
   */
  async processReturn(context: MissionContext): Promise<MissionReturnResult> {
    const { mission, originPlanet } = context

    if (!originPlanet) {
      return this.errorReturn('Origin planet not found')
    }

    const ships = this.getShips(mission)
    const resources = this.getResources(mission)

    // Add surviving probes back to origin planet
    if (ships.espionage_probe > 0) {
      const addShipsResult = await this.addShipsToPlanet(originPlanet.id, ships)
      if (!addShipsResult.success) {
        return this.errorReturn(`Failed to return probes: ${addShipsResult.error}`)
      }
    }

    // Add any resources (usually none for espionage)
    if (resources.metal > 0 || resources.crystal > 0 || resources.deuterium > 0) {
      const addResourcesResult = await this.addResourcesToPlanet(originPlanet.id, resources)
      if (!addResourcesResult.success) {
        return this.errorReturn(`Failed to return resources: ${addResourcesResult.error}`)
      }
    }

    // Create return message
    const originCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    const message = this.createMessage(
      mission.user_id,
      'espionage',
      'Espionage Probes Returned',
      ships.espionage_probe > 0
        ? `${ships.espionage_probe} espionage probe(s) have returned from ${originCoords}.`
        : `Your espionage mission to ${originCoords} has concluded. No probes survived.`
    )

    return this.successReturn([message], [])
  }

  // ============================================================================
  // INFO LEVEL CALCULATION
  // ============================================================================

  /**
   * Calculate the information level revealed based on tech difference
   *
   * Formula:
   * - Base tech difference = attackerTech - defenderTech
   * - Probe bonus = (probeCount - 1) * 0.25 (diminishing returns)
   * - Effective difference = base + probe bonus
   *
   * Thresholds:
   * - 0+: Resources
   * - 1+: Fleet
   * - 3+: Defense
   * - 5+: Buildings
   * - 7+: Research
   */
  private calculateInfoLevel(
    attackerTech: number,
    defenderTech: number,
    probeCount: number
  ): InfoLevel {
    // Base tech difference
    const baseDiff = attackerTech - defenderTech

    // Probe bonus (diminishing returns for extra probes)
    const probeBonus = Math.max(0, (probeCount - 1) * PROBE_INFO_BONUS)

    // Effective difference
    const effectiveDiff = baseDiff + probeBonus

    // Determine info level
    if (effectiveDiff >= INFO_LEVEL_THRESHOLDS[InfoLevel.RESEARCH]) {
      return InfoLevel.RESEARCH
    }
    if (effectiveDiff >= INFO_LEVEL_THRESHOLDS[InfoLevel.BUILDINGS]) {
      return InfoLevel.BUILDINGS
    }
    if (effectiveDiff >= INFO_LEVEL_THRESHOLDS[InfoLevel.DEFENSE]) {
      return InfoLevel.DEFENSE
    }
    if (effectiveDiff >= INFO_LEVEL_THRESHOLDS[InfoLevel.FLEET]) {
      return InfoLevel.FLEET
    }
    return InfoLevel.RESOURCES
  }

  // ============================================================================
  // COUNTER-ESPIONAGE
  // ============================================================================

  /**
   * Check if espionage is detected and calculate probe losses
   *
   * Counter-espionage formula:
   * - Detection chance = (defTech - attTech) * probeCount * 0.02
   * - Clamped to 0-100%
   * - If detected, probes may be destroyed
   */
  private checkCounterEspionage(
    attackerTech: number,
    defenderTech: number,
    probeCount: number
  ): CounterEspionageResult {
    // Tech advantage for defender
    const techDiff = defenderTech - attackerTech

    // Detection chance (only if defender has tech advantage)
    let detectionChance = 0
    if (techDiff > 0) {
      detectionChance = techDiff * probeCount * COUNTER_ESPIONAGE_BASE_FACTOR * 100
      // Clamp to 0-100%
      detectionChance = Math.min(100, Math.max(0, detectionChance))
    }

    // Roll for detection
    const roll = Math.random() * 100
    const detected = roll < detectionChance

    // Calculate probes lost if detected
    let probesLost = 0
    if (detected) {
      // Simplified combat - defender can destroy probes based on tech difference
      // Each point of tech advantage = ~20% chance to destroy each probe
      const destroyChancePerProbe = Math.min(1, techDiff * 0.2)
      for (let i = 0; i < probeCount; i++) {
        if (Math.random() < destroyChancePerProbe) {
          probesLost++
        }
      }
      // Always destroy at least one probe if detected
      probesLost = Math.max(1, probesLost)
    }

    return {
      detected,
      probesLost,
      detectionChance: Math.round(detectionChance * 100) / 100,
    }
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  /**
   * Generate espionage report based on info level
   */
  private generateReport(
    target: Planet,
    defenderResearch: UserResearch | null,
    infoLevel: InfoLevel,
    probeCount: number,
    counterEspionage: CounterEspionageResult
  ): EspionageReport {
    const now = new Date().toISOString()
    const reportId = `esp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const report: EspionageReport = {
      id: reportId,
      target_planet_id: target.id,
      target_player_id: target.user_id,
      target_planet_name: target.name,
      target_coordinates: `[${target.galaxy}:${target.system}:${target.position}]`,
      spy_count: probeCount,
      info_level: infoLevel,
      counter_espionage: counterEspionage.detected,
      probes_lost: counterEspionage.probesLost,
      counter_espionage_chance: counterEspionage.detectionChance,
      created_at: now,
    }

    // Always include resources (level 1)
    report.resources = {
      metal: target.metal,
      crystal: target.crystal,
      deuterium: target.deuterium,
    }

    // Fleet (level 2+)
    if (infoLevel >= InfoLevel.FLEET) {
      report.fleet = this.extractFleet(target)
    }

    // Defense (level 3+)
    if (infoLevel >= InfoLevel.DEFENSE) {
      report.defense = this.extractDefense(target)
    }

    // Buildings (level 4+)
    if (infoLevel >= InfoLevel.BUILDINGS) {
      report.buildings = this.extractBuildings(target)
    }

    // Research (level 5)
    if (infoLevel >= InfoLevel.RESEARCH && defenderResearch) {
      report.research = this.extractResearch(defenderResearch)
    }

    return report
  }

  /**
   * Extract fleet data from planet
   */
  private extractFleet(planet: Planet): Record<string, number> {
    const fleet: Record<string, number> = {}
    const planetData = planet as unknown as Record<string, number>

    for (const key of FLEET_KEYS) {
      const value = planetData[key]
      if (typeof value === 'number' && value > 0) {
        fleet[key] = value
      }
    }

    return fleet
  }

  /**
   * Extract defense data from planet
   */
  private extractDefense(planet: Planet): Record<string, number> {
    const defense: Record<string, number> = {}
    const planetData = planet as unknown as Record<string, number>

    for (const key of DEFENSE_KEYS) {
      const value = planetData[key]
      if (typeof value === 'number' && value > 0) {
        defense[key] = value
      }
    }

    return defense
  }

  /**
   * Extract building data from planet
   */
  private extractBuildings(planet: Planet): Record<string, number> {
    const buildings: Record<string, number> = {}
    const planetData = planet as unknown as Record<string, number>

    for (const key of BUILDING_KEYS) {
      const value = planetData[key]
      if (typeof value === 'number' && value > 0) {
        buildings[key] = value
      }
    }

    return buildings
  }

  /**
   * Extract research data from user research
   */
  private extractResearch(research: UserResearch): Record<string, number> {
    const researchData: Record<string, number> = {}
    const rawData = research as unknown as Record<string, number>

    for (const key of RESEARCH_KEYS) {
      const value = rawData[key]
      if (typeof value === 'number' && value > 0) {
        researchData[key] = value
      }
    }

    return researchData
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Save espionage report to database
   */
  private async saveEspionageReport(
    userId: string,
    report: EspionageReport
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.from('espionage_reports').insert({
      user_id: userId,
      target_user_id: report.target_player_id,
      target_planet_id: report.target_planet_id,
      resources: report.resources || null,
      buildings: report.buildings || null,
      research: report.research || null,
      ships: report.fleet || null,
      defense: report.defense || null,
      counter_espionage_chance: report.counter_espionage_chance,
    })

    if (error) {
      console.error('Failed to save espionage report:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  // ============================================================================
  // MESSAGE GENERATION
  // ============================================================================

  /**
   * Create espionage messages for attacker and defender
   */
  private createEspionageMessages(
    mission: {
      user_id: string
      destination_galaxy: number
      destination_system: number
      destination_position: number
    },
    targetPlanet: Planet,
    report: EspionageReport,
    counterEspionage: CounterEspionageResult
  ): ReturnType<typeof this.createMessage>[] {
    const messages: ReturnType<typeof this.createMessage>[] = []

    const targetCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    // Attacker report message
    const attackerBody = this.formatEspionageReport(report, counterEspionage)
    messages.push(
      this.createMessage(
        mission.user_id,
        'espionage',
        `Espionage Report - ${targetPlanet.name} ${targetCoords}`,
        attackerBody
      )
    )

    // Defender alert (only if detected)
    if (counterEspionage.detected) {
      messages.push(
        this.createMessage(
          targetPlanet.user_id,
          'espionage',
          'Counter-Espionage Alert',
          `Your counter-espionage detected enemy spy probes at ${targetPlanet.name} ${targetCoords}.\n\n` +
            `${counterEspionage.probesLost} probe(s) were destroyed by your defense systems.`
        )
      )
    }

    return messages
  }

  /**
   * Format espionage report for message body
   */
  private formatEspionageReport(
    report: EspionageReport,
    counterEspionage: CounterEspionageResult
  ): string {
    const lines: string[] = []

    // Header
    lines.push(`Espionage Report on ${report.target_planet_name} ${report.target_coordinates}`)
    lines.push(`Probes sent: ${report.spy_count}`)
    lines.push(`Counter-espionage chance: ${report.counter_espionage_chance}%`)
    lines.push('')

    // Resources (always visible)
    if (report.resources) {
      lines.push('=== RESOURCES ===')
      lines.push(`Metal: ${report.resources.metal.toLocaleString()}`)
      lines.push(`Crystal: ${report.resources.crystal.toLocaleString()}`)
      lines.push(`Deuterium: ${report.resources.deuterium.toLocaleString()}`)
      lines.push('')
    }

    // Fleet
    if (report.fleet && Object.keys(report.fleet).length > 0) {
      lines.push('=== FLEET ===')
      for (const [ship, count] of Object.entries(report.fleet)) {
        if (count > 0) {
          const shipName = this.formatKeyName(ship)
          lines.push(`${shipName}: ${count.toLocaleString()}`)
        }
      }
      lines.push('')
    } else if (report.info_level >= InfoLevel.FLEET) {
      lines.push('=== FLEET ===')
      lines.push('No fleet stationed.')
      lines.push('')
    }

    // Defense
    if (report.defense && Object.keys(report.defense).length > 0) {
      lines.push('=== DEFENSE ===')
      for (const [def, count] of Object.entries(report.defense)) {
        if (count > 0) {
          const defName = this.formatKeyName(def)
          lines.push(`${defName}: ${count.toLocaleString()}`)
        }
      }
      lines.push('')
    } else if (report.info_level >= InfoLevel.DEFENSE) {
      lines.push('=== DEFENSE ===')
      lines.push('No defense structures.')
      lines.push('')
    }

    // Buildings
    if (report.buildings && Object.keys(report.buildings).length > 0) {
      lines.push('=== BUILDINGS ===')
      for (const [building, level] of Object.entries(report.buildings)) {
        if (level > 0) {
          const buildingName = this.formatKeyName(building)
          lines.push(`${buildingName}: Level ${level}`)
        }
      }
      lines.push('')
    }

    // Research
    if (report.research && Object.keys(report.research).length > 0) {
      lines.push('=== RESEARCH ===')
      for (const [tech, level] of Object.entries(report.research)) {
        if (level > 0) {
          const techName = this.formatKeyName(tech)
          lines.push(`${techName}: Level ${level}`)
        }
      }
      lines.push('')
    }

    // Counter-espionage status
    if (counterEspionage.detected) {
      lines.push('=== WARNING ===')
      lines.push(`Your probes were detected! ${counterEspionage.probesLost} probe(s) destroyed.`)
    } else {
      lines.push('Your probes were not detected.')
    }

    return lines.join('\n')
  }

  /**
   * Format key name for display (e.g., light_fighter -> Light Fighter)
   */
  private formatKeyName(key: string): string {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}
