/**
 * ExplorationMission Handler
 *
 * Handles exploration missions to discover and scan solar systems.
 * Exploration missions include:
 * - Quick Scan: Fast detection of a system (1h)
 * - Deep Scan: Full exploration with planet details (4h)
 * - Cartography: Map a system for Data Card creation (8h)
 * - Satellite Deploy: Deploy permanent surveillance satellite (2h)
 *
 * Mission types: 20, 21, 22, 23
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
  getTotalShips,
} from '../types'
import {
  ExplorationMissionType,
  DiscoveryLevel,
  EXPLORATION_MISSION_CONFIG,
  SCAN_QUALITY_LIMITS,
  SPECIAL_FINDING_CONFIG,
  type SpecialFinding,
  type ExplorationMissionResults,
} from '@/lib/exploration/types'

// Messages for different exploration outcomes
const EXPLORATION_MESSAGES = {
  quick_scan: {
    success: [
      'Our probes have detected the target system. Basic telemetry acquired.',
      'Initial scan complete. System coordinates and star type identified.',
      'Quick reconnaissance successful. The system has been added to our charts.',
    ],
    partial: [
      'Scan partially successful. Some interference detected.',
      'We managed to get basic readings, but signal quality was poor.',
    ],
  },
  deep_scan: {
    success: [
      'Deep space exploration complete! All planetary bodies catalogued.',
      'Thorough scan reveals the full composition of this system.',
      'Our explorers have mapped every celestial body in the system.',
    ],
    special: [
      'During our exploration, we discovered something unusual...',
      'Our sensors detected an anomaly worth investigating.',
    ],
  },
  cartography: {
    success: [
      'Cartography mission complete. This system can now be recorded as a Data Card.',
      'Full stellar cartography achieved. System data ready for archival.',
      'Our cartographers have created detailed maps of this region.',
    ],
  },
  satellite_deploy: {
    success: [
      'Surveillance satellite deployed and operational.',
      'Satellite network extended. Continuous monitoring active.',
      'Strategic observation post established.',
    ],
    exists: [
      'Upgraded existing satellite with improved sensors.',
      'Satellite systems refreshed and enhanced.',
    ],
  },
}

export class ExplorationMission extends BaseMission {
  readonly missionType: MissionType = 'expedition' // Uses expedition as base type
  readonly hasReturn: boolean = true
  readonly name: string = 'Exploration'

  // Track the specific exploration mission type
  private explorationMissionType: ExplorationMissionType = 'quick_scan'

  /**
   * Process exploration mission arrival
   *
   * 1. Calculate scan quality based on fleet composition
   * 2. Determine discovery level based on mission type
   * 3. Apply discoveries to the database
   * 4. Check for special findings
   * 5. Create return mission
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission } = context

    const ships = this.getShips(mission)
    const totalShips = getTotalShips(ships)

    if (totalShips <= 0) {
      return this.errorArrival('No ships in fleet')
    }

    // Determine exploration mission type from metadata or default
    const missionMetadata = (mission as unknown as { mission_metadata?: { exploration_type?: string } }).mission_metadata
    this.explorationMissionType = (missionMetadata?.exploration_type as ExplorationMissionType) || 'quick_scan'

    // Get target system info
    const targetSystem = await this.getTargetSystemInfo(
      mission.destination_galaxy,
      mission.destination_system
    )

    if (!targetSystem) {
      return this.errorArrival('Target system not found')
    }

    // Calculate scan parameters
    const probeCount = ships.espionage_probe || 0
    const explorerCount = ships.pathfinder || 0
    const explorationTechLevel = context.attackerResearch?.astrophysics || 0
    const hasCartographer = explorerCount > 0 && this.explorationMissionType === 'cartography'

    // Calculate scan quality
    const scanQuality = this.calculateScanQuality(
      probeCount,
      explorerCount,
      hasCartographer,
      explorationTechLevel,
      this.explorationMissionType
    )

    // Determine discovery level
    const discoveryLevel = this.getDiscoveryLevel(this.explorationMissionType)

    // Apply discovery to database
    const discoveryResult = await this.applyDiscovery(
      mission.user_id,
      targetSystem.id,
      discoveryLevel,
      scanQuality
    )

    // Check for special findings
    const specialFindings = this.rollSpecialFindings(scanQuality)

    // Handle satellite deployment
    let satelliteDeployed = false
    if (this.explorationMissionType === 'satellite_deploy') {
      satelliteDeployed = await this.deploySatellite(
        mission.user_id,
        targetSystem.id,
        explorationTechLevel,
        scanQuality
      )
    }

    // Build exploration results
    const results: ExplorationMissionResults = {
      discovery_level: discoveryLevel,
      scan_quality: scanQuality,
      systems_detected: discoveryResult.connectedSystems,
      special_findings: specialFindings,
      is_first_discoverer: discoveryResult.isFirstDiscoverer,
      satellite_deployed: satelliteDeployed,
    }

    // If first discoverer, handle bonus
    if (discoveryResult.isFirstDiscoverer && discoveryResult.bonus) {
      results.bonus_claimed = discoveryResult.bonus
      await this.claimFirstDiscoveryBonus(mission.user_id, targetSystem.id)
    }

    // Build report message
    const targetCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      1
    )

    const reportBody = this.buildExplorationReport(
      targetCoords,
      results,
      targetSystem.starType,
      targetSystem.planetCount
    )

    const message = this.createMessage(
      mission.user_id,
      'expedition',
      this.getReportSubject(this.explorationMissionType),
      reportBody
    )

    // Exploration missions always return
    return {
      success: true,
      shouldReturn: true,
      returnResources: emptyResources(),
      returnShips: ships,
      messages: [message],
      updates: [],
    }
  }

  /**
   * Process exploration return
   */
  async processReturn(context: MissionContext): Promise<MissionReturnResult> {
    const { mission, originPlanet } = context

    if (!originPlanet) {
      return this.errorReturn('Origin planet not found')
    }

    const ships = this.getShips(mission)

    // Add ships back to origin planet
    const addShipsResult = await this.addShipsToPlanet(originPlanet.id, ships)
    if (!addShipsResult.success) {
      return this.errorReturn(`Failed to return ships: ${addShipsResult.error}`)
    }

    const originCoords = this.formatCoords(
      mission.origin_galaxy,
      mission.origin_system,
      mission.origin_position
    )

    const message = this.createMessage(
      mission.user_id,
      'expedition',
      'Exploration Fleet Returned',
      `Your exploration fleet has returned safely to ${originCoords}.`
    )

    return this.successReturn([message], [])
  }

  // ============================================================================
  // SCAN QUALITY CALCULATION
  // ============================================================================

  /**
   * Calculate scan quality based on fleet composition and tech
   */
  private calculateScanQuality(
    probeCount: number,
    explorerCount: number,
    hasCartographer: boolean,
    techLevel: number,
    missionType: ExplorationMissionType
  ): number {
    const config = EXPLORATION_MISSION_CONFIG[missionType]
    let quality = config.baseQuality

    // Probe bonus
    quality += Math.min(
      probeCount * SCAN_QUALITY_LIMITS.PROBE_PER_UNIT,
      SCAN_QUALITY_LIMITS.PROBE_MAX
    )

    // Explorer bonus
    quality += Math.min(
      explorerCount * SCAN_QUALITY_LIMITS.EXPLORER_PER_UNIT,
      SCAN_QUALITY_LIMITS.EXPLORER_MAX
    )

    // Cartographer bonus
    if (hasCartographer) {
      quality += SCAN_QUALITY_LIMITS.CARTOGRAPHER
    }

    // Tech level bonus
    quality += techLevel * SCAN_QUALITY_LIMITS.TECH_PER_LEVEL

    return Math.min(quality, SCAN_QUALITY_LIMITS.MAX_QUALITY)
  }

  /**
   * Get discovery level from mission type
   */
  private getDiscoveryLevel(missionType: ExplorationMissionType): DiscoveryLevel {
    return EXPLORATION_MISSION_CONFIG[missionType].minDiscoveryLevel
  }

  // ============================================================================
  // DISCOVERY APPLICATION
  // ============================================================================

  /**
   * Apply discovery to database
   */
  private async applyDiscovery(
    userId: string,
    systemId: string,
    discoveryLevel: DiscoveryLevel,
    scanQuality: number
  ): Promise<{
    isFirstDiscoverer: boolean
    connectedSystems: string[]
    bonus: { type: string; amount: number } | null
  }> {
    // Call the discover_system function
    const { data, error } = await this.supabase.rpc('discover_system', {
      p_user_id: userId,
      p_system_id: systemId,
      p_discovery_level: discoveryLevel,
      p_discovered_via: 'exploration_ship',
      p_scan_quality: scanQuality,
    })

    if (error) {
      console.error('Error applying discovery:', error)
      return {
        isFirstDiscoverer: false,
        connectedSystems: [],
        bonus: null,
      }
    }

    // Get connected systems
    const { data: connections } = await this.supabase.rpc('get_connected_systems', {
      p_system_id: systemId,
    })

    const connectedSystems = connections?.map((c: { connected_system_id: string }) => c.connected_system_id) || []

    // Check if first discoverer
    const { data: firstDisc } = await this.supabase
      .from('first_discoveries')
      .select('*')
      .eq('solar_system_id', systemId)
      .eq('user_id', userId)
      .single()

    const isFirstDiscoverer = !!firstDisc
    const bonus = isFirstDiscoverer && !firstDisc?.discovery_bonus_claimed
      ? { type: firstDisc.bonus_type || 'dark_matter', amount: firstDisc.bonus_amount || 10 }
      : null

    return {
      isFirstDiscoverer,
      connectedSystems,
      bonus,
    }
  }

  /**
   * Claim first discovery bonus
   */
  private async claimFirstDiscoveryBonus(userId: string, systemId: string): Promise<void> {
    await this.supabase.rpc('claim_first_discovery_bonus', {
      p_user_id: userId,
      p_system_id: systemId,
    })
  }

  // ============================================================================
  // SATELLITE DEPLOYMENT
  // ============================================================================

  /**
   * Deploy surveillance satellite
   */
  private async deploySatellite(
    userId: string,
    systemId: string,
    techLevel: number,
    scanQuality: number
  ): Promise<boolean> {
    const sensorRange = 1 + Math.floor(techLevel / 5)
    const scanQualityBonus = Math.floor(scanQuality / 10)
    const detectionBonus = 0.05 + techLevel * 0.01

    const { error } = await this.supabase
      .from('deployed_satellites')
      .upsert({
        user_id: userId,
        solar_system_id: systemId,
        sensor_range: sensorRange,
        scan_quality_bonus: scanQualityBonus,
        detection_bonus: detectionBonus,
        is_active: true,
        health: 100,
        deployed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,solar_system_id',
      })

    return !error
  }

  // ============================================================================
  // SPECIAL FINDINGS
  // ============================================================================

  /**
   * Roll for special findings based on scan quality
   */
  private rollSpecialFindings(scanQuality: number): SpecialFinding[] {
    const findings: SpecialFinding[] = []

    for (const config of SPECIAL_FINDING_CONFIG) {
      if (scanQuality < config.minQuality) continue

      const chance = config.baseChance + (scanQuality - config.minQuality) * config.qualityScaling
      if (Math.random() < chance) {
        findings.push(config.type)
      }
    }

    return findings
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get target system information
   */
  private async getTargetSystemInfo(
    galaxy: number,
    system: number
  ): Promise<{
    id: string
    starType: string
    planetCount: number
  } | null> {
    const { data } = await this.supabase
      .from('solar_systems')
      .select(`
        id,
        star_type,
        planet_count,
        galaxies!inner(galaxy_index)
      `)
      .eq('system_index', system)
      .eq('galaxies.galaxy_index', galaxy)
      .single()

    if (!data) return null

    return {
      id: data.id,
      starType: data.star_type,
      planetCount: data.planet_count || 0,
    }
  }

  /**
   * Get report subject based on mission type
   */
  private getReportSubject(missionType: ExplorationMissionType): string {
    switch (missionType) {
      case 'quick_scan':
        return 'Quick Scan Report'
      case 'deep_scan':
        return 'Deep Space Exploration Report'
      case 'cartography':
        return 'Cartography Mission Complete'
      case 'satellite_deploy':
        return 'Satellite Deployment Report'
      default:
        return 'Exploration Report'
    }
  }

  /**
   * Build exploration report message
   */
  private buildExplorationReport(
    coords: string,
    results: ExplorationMissionResults,
    starType: string,
    planetCount: number
  ): string {
    const lines: string[] = [
      `Exploration Report - ${coords}`,
      '',
    ]

    // Add message based on mission type
    const messages = EXPLORATION_MESSAGES[this.explorationMissionType as keyof typeof EXPLORATION_MESSAGES]
    if (messages) {
      const successMessages = 'success' in messages ? messages.success : []
      if (successMessages.length > 0) {
        lines.push(successMessages[Math.floor(Math.random() * successMessages.length)])
        lines.push('')
      }
    }

    // System info
    lines.push('System Information:')
    lines.push(`  Star Type: ${this.formatStarType(starType)}`)
    lines.push(`  Planets: ${planetCount}`)
    lines.push(`  Discovery Level: ${results.discovery_level}`)
    lines.push(`  Scan Quality: ${results.scan_quality}%`)
    lines.push('')

    // First discoverer bonus
    if (results.is_first_discoverer) {
      lines.push('*** FIRST DISCOVERY ***')
      lines.push('You are the first to explore this system!')
      if (results.bonus_claimed) {
        lines.push(`Bonus: +${results.bonus_claimed.amount} ${results.bonus_claimed.type}`)
      }
      lines.push('')
    }

    // Connected systems
    if (results.systems_detected && results.systems_detected.length > 0) {
      lines.push(`Detected ${results.systems_detected.length} connected system(s).`)
      lines.push('')
    }

    // Special findings
    if (results.special_findings.length > 0) {
      lines.push('Special Findings:')
      for (const finding of results.special_findings) {
        lines.push(`  - ${this.formatSpecialFinding(finding)}`)
      }
      lines.push('')
    }

    // Satellite
    if (results.satellite_deployed) {
      lines.push('Surveillance satellite successfully deployed.')
      lines.push('')
    }

    lines.push('Your fleet is returning to base.')

    return lines.join('\n')
  }

  /**
   * Format star type for display
   */
  private formatStarType(starType: string): string {
    return starType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Format special finding for display
   */
  private formatSpecialFinding(finding: SpecialFinding): string {
    const descriptions: Record<SpecialFinding, string> = {
      ancient_ruins: 'Ancient alien ruins detected on planetary surface',
      resource_deposit: 'Significant resource deposits identified',
      wormhole_signature: 'Unstable wormhole signature detected nearby',
      artifact_site: 'Potential artifact recovery site located',
      pirate_cache: 'Hidden pirate supply cache discovered',
      derelict_ship: 'Derelict vessel detected, salvageable',
      anomaly: 'Unknown spatial anomaly requires investigation',
    }

    return descriptions[finding] || finding
  }
}
