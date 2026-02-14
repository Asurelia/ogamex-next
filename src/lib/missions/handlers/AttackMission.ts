/**
 * AttackMission Handler
 *
 * Handles attack missions against other players' planets using the BattleEngine.
 *
 * Features:
 * - Full combat simulation with 6 rounds
 * - Rapid fire mechanics
 * - Technology bonuses
 * - Debris field generation
 * - Loot calculation
 * - Moon creation chance
 * - Battle reports for both players
 */

import type { MissionType } from '@/types/database'
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
  hasResources,
} from '../types'
import {
  BattleEngine,
  type BattleResult,
  type FleetComposition,
  type DefenseComposition,
  type TechLevels,
  DEFENSE_KEYS,
} from '../../battle'
import { createMoonService } from '../../moons'

export class AttackMission extends BaseMission {
  readonly missionType: MissionType = 'attack'
  readonly hasReturn: boolean = true
  readonly name: string = 'Attack'

  /**
   * Process attack mission arrival
   *
   * 1. Run battle simulation via BattleEngine
   * 2. Calculate losses for both sides
   * 3. Calculate loot (50% of defender resources up to cargo capacity)
   * 4. Create debris field
   * 5. Check for moon creation
   * 6. Generate battle reports for both players
   * 7. Return remaining fleet with loot
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission, targetPlanet, attackerResearch, defenderResearch } = context

    // Target planet must exist
    if (!targetPlanet) {
      const ships = this.getShips(mission)
      const resources = this.getResources(mission)

      const message = this.createMessage(
        mission.user_id,
        'battle',
        'Attack Mission Failed',
        `Your attack fleet arrived at ${this.formatCoords(
          mission.destination_galaxy,
          mission.destination_system,
          mission.destination_position
        )} but found no planet. The fleet is returning.`
      )

      return this.successArrival(true, resources, ships, [message], [])
    }

    // Cannot attack own planets
    if (targetPlanet.user_id === mission.user_id) {
      return this.errorArrival('Cannot attack your own planet')
    }

    const attackerShips = this.getShips(mission)
    const attackerResources = this.getResources(mission)

    // Extract defender fleet and defense
    const defenderFleet = this.extractFleetComposition(targetPlanet)
    const defenderDefense = this.extractDefenseComposition(targetPlanet)
    const defenderResources: Resources = {
      metal: targetPlanet.metal || 0,
      crystal: targetPlanet.crystal || 0,
      deuterium: targetPlanet.deuterium || 0,
    }

    // Extract technology levels
    const attackerTech = this.extractTechLevels(attackerResearch)
    const defenderTech = this.extractTechLevels(defenderResearch)

    // Run battle simulation
    const battleEngine = new BattleEngine(attackerTech, defenderTech)
    const battleResult = battleEngine.simulate(
      attackerShips as FleetComposition,
      defenderFleet,
      defenderDefense,
      defenderResources
    )

    // Apply battle results to defender planet
    await this.applyBattleResults(targetPlanet.id, battleResult)

    // Create or update debris field
    if (battleResult.debris.metal > 0 || battleResult.debris.crystal > 0) {
      await this.createOrUpdateDebrisField(
        mission.destination_galaxy,
        mission.destination_system,
        mission.destination_position,
        battleResult.debris.metal,
        battleResult.debris.crystal
      )
    }

    // Handle moon creation using MoonService
    if (battleResult.moonCreated) {
      await this.handleMoonCreation(targetPlanet.id, battleResult.debris)
    }

    // Save battle report
    await this.saveBattleReport(mission, targetPlanet, battleResult)

    // Create battle report messages
    const messages = this.createBattleMessages(
      mission,
      targetPlanet,
      battleResult
    )

    // Calculate return resources (original + loot)
    const returnResources: Resources = {
      metal: attackerResources.metal + battleResult.loot.metal,
      crystal: attackerResources.crystal + battleResult.loot.crystal,
      deuterium: attackerResources.deuterium + battleResult.loot.deuterium,
    }

    // Convert remaining ships to ShipCounts
    const returnShips = this.convertToShipCounts(battleResult.attackerRemaining.ships)

    return this.successArrival(
      true,
      returnResources,
      returnShips,
      messages,
      []
    )
  }

  /**
   * Process attack mission return
   */
  async processReturn(context: MissionContext): Promise<MissionReturnResult> {
    const { mission, originPlanet } = context

    if (!originPlanet) {
      return this.errorReturn('Origin planet not found')
    }

    const ships = this.getShips(mission)
    const resources = this.getResources(mission)

    // Add ships back to origin
    const addShipsResult = await this.addShipsToPlanet(originPlanet.id, ships)
    if (!addShipsResult.success) {
      return this.errorReturn(`Failed to return ships: ${addShipsResult.error}`)
    }

    // Add resources (including loot)
    if (hasResources(resources)) {
      const addResourcesResult = await this.addResourcesToPlanet(originPlanet.id, resources)
      if (!addResourcesResult.success) {
        return this.errorReturn(`Failed to return resources: ${addResourcesResult.error}`)
      }
    }

    // Create return message
    const destCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    let messageBody = `Your fleet has returned from attack mission to ${destCoords}.`

    if (hasResources(resources)) {
      messageBody += `\n\nResources carried:\n`
      messageBody += `Metal: ${resources.metal.toLocaleString()}\n`
      messageBody += `Crystal: ${resources.crystal.toLocaleString()}\n`
      messageBody += `Deuterium: ${resources.deuterium.toLocaleString()}`
    }

    const message = this.createMessage(
      mission.user_id,
      'battle',
      'Fleet Returned',
      messageBody
    )

    return this.successReturn([message], [])
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Extract fleet composition from a planet
   */
  private extractFleetComposition(planet: Record<string, unknown>): FleetComposition {
    const fleet: FleetComposition = {}
    for (const key of SHIP_KEYS) {
      const count = planet[key] as number | undefined
      if (count && count > 0) {
        fleet[key] = count
      }
    }
    return fleet
  }

  /**
   * Extract defense composition from a planet
   */
  private extractDefenseComposition(planet: Record<string, unknown>): DefenseComposition {
    const defense: DefenseComposition = {}
    for (const key of DEFENSE_KEYS) {
      const count = planet[key] as number | undefined
      if (count && count > 0) {
        defense[key] = count
      }
    }
    return defense
  }

  /**
   * Extract technology levels from research
   */
  private extractTechLevels(
    research: { weapons_technology?: number; shielding_technology?: number; armor_technology?: number } | null
  ): TechLevels {
    return {
      weaponsTech: research?.weapons_technology || 0,
      shieldTech: research?.shielding_technology || 0,
      armorTech: research?.armor_technology || 0,
    }
  }

  /**
   * Convert partial ship counts to full ShipCounts
   */
  private convertToShipCounts(partial: Partial<ShipCounts>): ShipCounts {
    const ships = emptyShipCounts()
    for (const key of SHIP_KEYS) {
      ships[key] = partial[key] || 0
    }
    return ships
  }

  /**
   * Apply battle results to defender planet
   */
  private async applyBattleResults(
    planetId: string,
    result: BattleResult
  ): Promise<void> {
    // Deduct loot from planet
    if (hasResources(result.loot)) {
      await this.deductResourcesFromPlanet(planetId, result.loot)
    }

    // Remove destroyed ships
    const shipsLost = this.convertToShipCounts(result.defenderLosses.ships.ships)
    await this.removeShipsFromPlanet(planetId, shipsLost)

    // Remove destroyed defenses
    await this.removeDefenseFromPlanet(planetId, result.defenderLosses.defense.defense)
  }

  /**
   * Remove defense from a planet
   */
  private async removeDefenseFromPlanet(
    planetId: string,
    defense: Partial<DefenseComposition>
  ): Promise<{ success: boolean; error?: string }> {
    const hasDefense = Object.values(defense).some(v => v && v > 0)
    if (!hasDefense) {
      return { success: true }
    }

    // Get current defense
    const { data: planet } = await this.supabase
      .from('planets')
      .select(DEFENSE_KEYS.join(', '))
      .eq('id', planetId)
      .single()

    if (!planet) {
      return { success: false, error: 'Planet not found' }
    }

    const planetData = planet as unknown as Record<string, number>
    const updateData: Record<string, number> = {}

    for (const key of DEFENSE_KEYS) {
      const lost = defense[key] || 0
      if (lost > 0) {
        updateData[key] = Math.max(0, (planetData[key] || 0) - lost)
      }
    }

    const { error } = await this.supabase
      .from('planets')
      .update(updateData)
      .eq('id', planetId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Create or update debris field
   */
  private async createOrUpdateDebrisField(
    galaxy: number,
    system: number,
    position: number,
    metal: number,
    crystal: number
  ): Promise<void> {
    const { data: existing } = await this.supabase
      .from('debris_fields')
      .select('id, metal, crystal')
      .eq('galaxy', galaxy)
      .eq('system', system)
      .eq('position', position)
      .single()

    if (existing) {
      await this.supabase
        .from('debris_fields')
        .update({
          metal: existing.metal + metal,
          crystal: existing.crystal + crystal,
        })
        .eq('id', existing.id)
    } else {
      await this.supabase.from('debris_fields').insert({
        galaxy,
        system,
        position,
        metal,
        crystal,
      })
    }
  }

  /**
   * Create a moon from battle debris using MoonService
   * Note: The moon is already created by the caller when battleResult.moonCreated is true.
   * This method is kept for backward compatibility but now uses MoonService.
   */
  private async createMoon(
    _galaxy: number,
    _system: number,
    _position: number,
    _userId: string
  ): Promise<void> {
    // This method is no longer used directly.
    // Moon creation is now handled by handleMoonCreation method.
    // Kept for backward compatibility.
  }

  /**
   * Handle moon creation after battle using MoonService
   */
  private async handleMoonCreation(
    planetId: string,
    debris: { metal: number; crystal: number }
  ): Promise<void> {
    const moonService = createMoonService(this.supabase)
    await moonService.createMoon(planetId, debris)
  }

  /**
   * Save battle report to database
   */
  private async saveBattleReport(
    mission: { user_id: string; destination_galaxy: number; destination_system: number; destination_position: number },
    targetPlanet: { id: string; user_id: string },
    result: BattleResult
  ): Promise<void> {
    const coordinates = `[${mission.destination_galaxy}:${mission.destination_system}:${mission.destination_position}]`

    const attackerLossesValue =
      result.attackerLosses.metalValue +
      result.attackerLosses.crystalValue +
      result.attackerLosses.deuteriumValue

    const defenderLossesValue =
      result.defenderLosses.totalMetalValue +
      result.defenderLosses.totalCrystalValue +
      result.defenderLosses.totalDeuteriumValue

    await this.supabase.from('battle_reports').insert({
      attacker_id: mission.user_id,
      defender_id: targetPlanet.user_id,
      planet_id: targetPlanet.id,
      coordinates,
      winner: result.winner,
      rounds: result.totalRounds,
      attacker_losses: attackerLossesValue,
      defender_losses: defenderLossesValue,
      loot_metal: result.loot.metal,
      loot_crystal: result.loot.crystal,
      loot_deuterium: result.loot.deuterium,
      debris_metal: result.debris.metal,
      debris_crystal: result.debris.crystal,
      moon_created: result.moonCreated,
      report_data: JSON.stringify({
        rounds: result.rounds,
        attackerRemaining: result.attackerRemaining,
        defenderRemaining: result.defenderRemaining,
        attackerLosses: result.attackerLosses,
        defenderLosses: result.defenderLosses,
        moonChance: result.moonChance,
      }),
    })
  }

  /**
   * Create battle messages for both players
   */
  private createBattleMessages(
    mission: { user_id: string; origin_galaxy: number; origin_system: number; origin_position: number; destination_galaxy: number; destination_system: number; destination_position: number },
    targetPlanet: { user_id: string },
    result: BattleResult
  ): ReturnType<typeof this.createMessage>[] {
    const messages: ReturnType<typeof this.createMessage>[] = []

    const targetCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    const winnerText = result.winner === 'attacker'
      ? 'The attacker has won the battle!'
      : result.winner === 'defender'
        ? 'The defender has won the battle!'
        : 'The battle ended in a draw.'

    const moonText = result.moonCreated
      ? `\n\nA moon has been created with ${result.moonChance}% chance!`
      : result.moonChance > 0
        ? `\n\nMoon creation chance: ${result.moonChance}% (no moon created)`
        : ''

    // Attacker message
    const attackerLossesText = this.formatLosses(result.attackerLosses.ships)
    const attackerMessage = this.createMessage(
      mission.user_id,
      'battle',
      `Battle Report - Attack on ${targetCoords}`,
      `${winnerText}\n\n` +
        `Battle lasted ${result.totalRounds} round(s).\n\n` +
        `Your losses:\n${attackerLossesText || 'None'}\n\n` +
        `Loot captured:\n` +
        `Metal: ${result.loot.metal.toLocaleString()}\n` +
        `Crystal: ${result.loot.crystal.toLocaleString()}\n` +
        `Deuterium: ${result.loot.deuterium.toLocaleString()}\n\n` +
        `Debris field:\n` +
        `Metal: ${result.debris.metal.toLocaleString()}\n` +
        `Crystal: ${result.debris.crystal.toLocaleString()}` +
        moonText
    )
    messages.push(attackerMessage)

    // Defender message
    const defenderShipLossesText = this.formatLosses(result.defenderLosses.ships.ships)
    const defenderDefenseLossesText = this.formatDefenseLosses(result.defenderLosses.defense.defense)
    const defenderMessage = this.createMessage(
      targetPlanet.user_id,
      'battle',
      `Battle Report - Defense of ${targetCoords}`,
      `Your planet at ${targetCoords} was attacked!\n\n` +
        `${winnerText}\n\n` +
        `Battle lasted ${result.totalRounds} round(s).\n\n` +
        `Your ship losses:\n${defenderShipLossesText || 'None'}\n\n` +
        `Your defense losses:\n${defenderDefenseLossesText || 'None'}\n\n` +
        `Resources lost:\n` +
        `Metal: ${result.loot.metal.toLocaleString()}\n` +
        `Crystal: ${result.loot.crystal.toLocaleString()}\n` +
        `Deuterium: ${result.loot.deuterium.toLocaleString()}` +
        moonText
    )
    messages.push(defenderMessage)

    return messages
  }

  /**
   * Format ship losses for message
   */
  private formatLosses(ships: Partial<ShipCounts>): string {
    const lines: string[] = []
    for (const [key, count] of Object.entries(ships)) {
      if (count && count > 0) {
        const name = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        lines.push(`${name}: ${count.toLocaleString()}`)
      }
    }
    return lines.join('\n')
  }

  /**
   * Format defense losses for message
   */
  private formatDefenseLosses(defense: Partial<DefenseComposition>): string {
    const lines: string[] = []
    for (const [key, count] of Object.entries(defense)) {
      if (count && count > 0) {
        const name = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        lines.push(`${name}: ${count.toLocaleString()}`)
      }
    }
    return lines.join('\n')
  }
}
