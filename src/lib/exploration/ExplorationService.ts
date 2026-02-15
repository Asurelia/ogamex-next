/**
 * Exploration Service
 * Manages fog of war, discoveries, and system visibility
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  DiscoveryLevel,
  DiscoveryMethod,
  PlayerDiscovery,
  FirstDiscovery,
  VisibleSystem,
  SystemConnection,
  DiscoverSystemResponse,
  ExplorationStats,
  VisibilityLevel,
  ExplorationMissionType,
  ExplorationMissionStatus,
  ExplorationMission,
  ExplorationMissionResults,
  DeployedSatellite,
  SpecialFinding,
  CompleteMissionResult,
  CreateMissionParams,
  CalculateScanQualityParams,
} from './types'

import {
  EXPLORATION_MISSION_CONFIG,
  SCAN_QUALITY_LIMITS,
  SPECIAL_FINDING_CONFIG,
} from './types'

export class ExplorationService {
  constructor(private supabase: SupabaseClient) {}

  // ============================================================================
  // DISCOVERY MANAGEMENT
  // ============================================================================

  /**
   * Discover a system for a player
   */
  async discoverSystem(
    userId: string,
    galaxyIndex: number,
    systemIndex: number,
    discoveryLevel: DiscoveryLevel,
    discoveredVia: DiscoveryMethod,
    scanQuality: number = 0
  ): Promise<DiscoverSystemResponse> {
    // Call the SQL function
    const { data, error } = await this.supabase.rpc('discover_system', {
      p_user_id: userId,
      p_galaxy_index: galaxyIndex,
      p_system_index: systemIndex,
      p_discovery_level: discoveryLevel,
      p_discovered_via: discoveredVia,
      p_scan_quality: scanQuality
    })

    if (error) {
      return {
        success: false,
        discovery: null,
        isFirstDiscoverer: false,
        bonus: null,
        newlyVisibleSystems: [],
        error: error.message
      }
    }

    // Get the discovery record
    const discovery = await this.getDiscovery(userId, data)

    // Get newly visible systems (connected to this one)
    const newlyVisible = await this.getConnectedSystems(data, userId)

    // Check if first discoverer
    const firstDiscovery = await this.getFirstDiscovery(data)
    const isFirst = firstDiscovery?.userId === userId

    return {
      success: true,
      discovery,
      isFirstDiscoverer: isFirst,
      bonus: isFirst && firstDiscovery ? {
        type: firstDiscovery.bonusType || 'dark_matter',
        amount: firstDiscovery.bonusAmount || 0
      } : null,
      newlyVisibleSystems: newlyVisible
    }
  }

  /**
   * Upgrade discovery level for a system
   */
  async upgradeDiscoveryLevel(
    userId: string,
    systemId: string,
    newLevel: DiscoveryLevel,
    newScanQuality: number
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.rpc('upgrade_discovery_level', {
      p_user_id: userId,
      p_system_id: systemId,
      p_new_level: newLevel,
      p_new_scan_quality: newScanQuality
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Get a player's discovery for a specific system
   */
  async getDiscovery(userId: string, systemId: string): Promise<PlayerDiscovery | null> {
    const { data, error } = await this.supabase
      .from('player_discoveries')
      .select('*')
      .eq('user_id', userId)
      .eq('solar_system_id', systemId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      userId: data.user_id,
      solarSystemId: data.solar_system_id,
      discoveryLevel: data.discovery_level,
      discoveredAt: data.discovered_at,
      discoveredVia: data.discovered_via,
      scanQuality: data.scan_quality,
      isFirstDiscoverer: data.is_first_discoverer,
      lastScannedAt: data.last_scanned_at
    }
  }

  /**
   * Get all discoveries for a player
   */
  async getPlayerDiscoveries(userId: string): Promise<PlayerDiscovery[]> {
    const { data, error } = await this.supabase
      .from('player_discoveries')
      .select('*')
      .eq('user_id', userId)
      .order('discovered_at', { ascending: false })

    if (error || !data) return []

    return data.map(d => ({
      id: d.id,
      userId: d.user_id,
      solarSystemId: d.solar_system_id,
      discoveryLevel: d.discovery_level,
      discoveredAt: d.discovered_at,
      discoveredVia: d.discovered_via,
      scanQuality: d.scan_quality,
      isFirstDiscoverer: d.is_first_discoverer,
      lastScannedAt: d.last_scanned_at
    }))
  }

  /**
   * Get first discovery record for a system
   */
  async getFirstDiscovery(systemId: string): Promise<FirstDiscovery | null> {
    const { data, error } = await this.supabase
      .from('first_discoveries')
      .select('*')
      .eq('solar_system_id', systemId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      solarSystemId: data.solar_system_id,
      userId: data.user_id,
      discoveredAt: data.discovered_at,
      discoveryBonusClaimed: data.discovery_bonus_claimed,
      bonusType: data.bonus_type,
      bonusAmount: data.bonus_amount
    }
  }

  /**
   * Claim first discovery bonus
   */
  async claimFirstDiscoveryBonus(
    userId: string,
    systemId: string
  ): Promise<{ success: boolean; bonusType?: string; bonusAmount?: number; error?: string }> {
    const { data, error } = await this.supabase.rpc('claim_first_discovery_bonus', {
      p_user_id: userId,
      p_system_id: systemId
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'No bonus to claim' }
    }

    return {
      success: true,
      bonusType: data.bonus_type,
      bonusAmount: data.bonus_amount
    }
  }

  // ============================================================================
  // VISIBILITY
  // ============================================================================

  /**
   * Get all visible systems for a player
   */
  async getVisibleSystems(
    userId: string,
    galaxyIndex?: number
  ): Promise<VisibleSystem[]> {
    const { data, error } = await this.supabase.rpc('get_visible_systems', {
      p_user_id: userId
    })

    if (error || !data) return []

    let systems = data as any[]

    // Filter by galaxy if specified
    if (galaxyIndex !== undefined) {
      systems = systems.filter(s => s.galaxy_index === galaxyIndex)
    }

    return systems.map(s => this.mapToVisibleSystem(s))
  }

  /**
   * Get visible systems for a specific galaxy
   */
  async getGalaxyView(
    userId: string,
    galaxyIndex: number
  ): Promise<VisibleSystem[]> {
    return this.getVisibleSystems(userId, galaxyIndex)
  }

  /**
   * Check if a system is visible to a player
   */
  async isSystemVisible(
    userId: string,
    systemId: string
  ): Promise<{ visible: boolean; level: VisibilityLevel }> {
    // Check direct discovery
    const discovery = await this.getDiscovery(userId, systemId)
    if (discovery) {
      return { visible: true, level: discovery.discoveryLevel }
    }

    // Check if connected to a discovered system
    const { data, error } = await this.supabase.rpc('is_system_connected_to_discovered', {
      p_user_id: userId,
      p_system_id: systemId
    })

    if (error) {
      return { visible: false, level: 'hidden' }
    }

    if (data) {
      return { visible: true, level: 'connected' }
    }

    return { visible: false, level: 'hidden' }
  }

  /**
   * Get system info with fog of war applied
   */
  async getSystemWithFog(
    userId: string,
    galaxyIndex: number,
    systemIndex: number
  ): Promise<VisibleSystem | null> {
    // First, ensure the system exists (lazy generation)
    const { data: systemId, error: genError } = await this.supabase.rpc(
      'get_or_generate_system',
      { p_galaxy_index: galaxyIndex, p_system_index: systemIndex }
    )

    if (genError || !systemId) return null

    // Check visibility
    const { visible, level } = await this.isSystemVisible(userId, systemId)

    if (!visible) {
      return null
    }

    // Get full system info and apply fog
    const { data: systemData, error } = await this.supabase
      .from('solar_systems')
      .select(`
        *,
        galaxy:galaxies(galaxy_index, name),
        star:star_types(*),
        connections:system_connections!system_a_id(
          id,
          system_b_id,
          connection_type,
          distance
        )
      `)
      .eq('id', systemId)
      .single()

    if (error || !systemData) return null

    // Get discovery info
    const discovery = await this.getDiscovery(userId, systemId)

    return this.applyFogOfWar(systemData, discovery, level)
  }

  // ============================================================================
  // CONNECTIONS
  // ============================================================================

  /**
   * Get systems connected to a given system
   */
  async getConnectedSystems(
    systemId: string,
    userId?: string
  ): Promise<VisibleSystem[]> {
    const { data, error } = await this.supabase.rpc('get_connected_systems', {
      p_system_id: systemId
    })

    if (error || !data) return []

    const systems: VisibleSystem[] = []

    for (const conn of data) {
      const targetId = conn.connected_system_id

      // If user provided, check their discovery status
      let visibility: VisibilityLevel = 'connected'
      let discovery: PlayerDiscovery | null = null

      if (userId) {
        discovery = await this.getDiscovery(userId, targetId)
        if (discovery) {
          visibility = discovery.discoveryLevel
        }
      }

      // Get basic system info
      const { data: sysData } = await this.supabase
        .from('solar_systems')
        .select(`
          *,
          galaxy:galaxies(galaxy_index, name)
        `)
        .eq('id', targetId)
        .single()

      if (sysData) {
        systems.push(this.applyFogOfWar(sysData, discovery, visibility))
      }
    }

    return systems
  }

  /**
   * Get all connections for a system
   */
  async getSystemConnections(systemId: string): Promise<SystemConnection[]> {
    const { data, error } = await this.supabase
      .from('system_connections')
      .select('*')
      .or(`system_a_id.eq.${systemId},system_b_id.eq.${systemId}`)

    if (error || !data) return []

    return data.map(c => ({
      id: c.id,
      systemAId: c.system_a_id,
      systemBId: c.system_b_id,
      connectionType: c.connection_type,
      distance: c.distance,
      isStable: c.is_stable,
      expiresAt: c.expires_at,
      discoveredBy: c.discovered_by,
      createdAt: c.created_at
    }))
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get exploration statistics for a player
   */
  async getExplorationStats(userId: string): Promise<ExplorationStats> {
    // Get discovery counts
    const { data: discoveries } = await this.supabase
      .from('player_discoveries')
      .select('discovery_level, is_first_discoverer, solar_system_id')
      .eq('user_id', userId)

    if (!discoveries) {
      return this.emptyStats()
    }

    // Count by level
    const totalDiscovered = discoveries.length
    const totalExplored = discoveries.filter(d =>
      d.discovery_level === 'explored' || d.discovery_level === 'mapped'
    ).length
    const totalMapped = discoveries.filter(d => d.discovery_level === 'mapped').length
    const totalFirstDiscoveries = discoveries.filter(d => d.is_first_discoverer).length

    // Get bonus claims
    const { count: bonusesClaimed } = await this.supabase
      .from('first_discoveries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('discovery_bonus_claimed', true)

    // Get galaxies visited
    const { data: galaxyData } = await this.supabase
      .from('player_discoveries')
      .select(`
        solar_system:solar_systems(
          galaxy:galaxies(galaxy_index, name, system_count)
        )
      `)
      .eq('user_id', userId)

    const galaxyMap = new Map<number, { name: string; discovered: number; total: number }>()

    if (galaxyData) {
      for (const d of galaxyData) {
        const galaxy = (d.solar_system as any)?.galaxy
        if (galaxy) {
          const existing = galaxyMap.get(galaxy.galaxy_index)
          if (existing) {
            existing.discovered++
          } else {
            galaxyMap.set(galaxy.galaxy_index, {
              name: galaxy.name,
              discovered: 1,
              total: galaxy.system_count
            })
          }
        }
      }
    }

    const byGalaxy = Array.from(galaxyMap.entries()).map(([idx, data]) => ({
      galaxyIndex: idx,
      galaxyName: data.name,
      systemsDiscovered: data.discovered,
      systemsTotal: data.total,
      percentExplored: Math.round((data.discovered / data.total) * 100)
    }))

    // Get recent discoveries
    const { data: recentData } = await this.supabase
      .from('player_discoveries')
      .select(`
        solar_system_id,
        discovered_at,
        is_first_discoverer,
        solar_system:solar_systems(
          system_index,
          star_type,
          galaxy:galaxies(galaxy_index)
        )
      `)
      .eq('user_id', userId)
      .order('discovered_at', { ascending: false })
      .limit(10)

    const recentDiscoveries = (recentData || []).map(d => ({
      systemId: d.solar_system_id,
      galaxyIndex: (d.solar_system as any)?.galaxy?.galaxy_index || 0,
      systemIndex: (d.solar_system as any)?.system_index || 0,
      starType: (d.solar_system as any)?.star_type || 'unknown',
      discoveredAt: d.discovered_at,
      isFirst: d.is_first_discoverer
    }))

    return {
      totalSystemsDiscovered: totalDiscovered,
      totalSystemsExplored: totalExplored,
      totalSystemsMapped: totalMapped,
      totalFirstDiscoveries: totalFirstDiscoveries,
      totalBonusesClaimed: bonusesClaimed || 0,
      galaxiesVisited: galaxyMap.size,
      byGalaxy,
      recentDiscoveries
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapToVisibleSystem(data: any): VisibleSystem {
    return {
      systemId: data.system_id,
      galaxyId: data.galaxy_id,
      galaxyIndex: data.galaxy_index,
      systemIndex: data.system_index,
      visibility: data.visibility || 'detected',
      discoveryLevel: data.discovery_level,
      scanQuality: data.scan_quality || 0,
      starType: data.star_type,
      secondaryStarType: data.secondary_star_type,
      planetCount: data.planet_count,
      habitableZoneInner: data.habitable_zone_inner,
      habitableZoneOuter: data.habitable_zone_outer,
      connections: data.connections || [],
      colonies: data.colonies,
      isFirstDiscoverer: data.is_first_discoverer || false,
      discoveredAt: data.discovered_at
    }
  }

  private applyFogOfWar(
    systemData: any,
    discovery: PlayerDiscovery | null,
    visibility: VisibilityLevel
  ): VisibleSystem {
    const scanQuality = discovery?.scanQuality || 0
    const level = discovery?.discoveryLevel || visibility

    // Base info always available
    const base: VisibleSystem = {
      systemId: systemData.id,
      galaxyId: systemData.galaxy_id,
      galaxyIndex: systemData.galaxy?.galaxy_index || 0,
      systemIndex: systemData.system_index,
      visibility,
      discoveryLevel: discovery?.discoveryLevel || null,
      scanQuality,
      starType: null,
      secondaryStarType: null,
      planetCount: null,
      habitableZoneInner: null,
      habitableZoneOuter: null,
      connections: [],
      colonies: null,
      isFirstDiscoverer: discovery?.isFirstDiscoverer || false,
      discoveredAt: discovery?.discoveredAt || null
    }

    // Apply visibility rules
    if (level === 'detected' || level === 'connected') {
      // Only position known
      return base
    }

    if (level === 'scanned' || level === 'explored' || level === 'mapped') {
      // Star type and planet count visible
      base.starType = systemData.star_type
      base.secondaryStarType = systemData.secondary_star_type

      if (scanQuality >= 20) {
        base.planetCount = systemData.planet_count
      }

      if (scanQuality >= 40) {
        base.habitableZoneInner = systemData.habitable_zone_inner
        base.habitableZoneOuter = systemData.habitable_zone_outer
      }
    }

    if (level === 'explored' || level === 'mapped') {
      // Colonies visible
      // This would need additional query for colonies
      base.colonies = []
    }

    // Connections always visible if system is at least detected
    if (systemData.connections) {
      base.connections = systemData.connections.map((c: any) => ({
        targetSystemId: c.system_b_id,
        targetGalaxyIndex: 0, // Would need join
        targetSystemIndex: 0, // Would need join
        connectionType: c.connection_type,
        isVisible: true
      }))
    }

    return base
  }

  private emptyStats(): ExplorationStats {
    return {
      totalSystemsDiscovered: 0,
      totalSystemsExplored: 0,
      totalSystemsMapped: 0,
      totalFirstDiscoveries: 0,
      totalBonusesClaimed: 0,
      galaxiesVisited: 0,
      byGalaxy: [],
      recentDiscoveries: []
    }
  }

  // ============================================================================
  // EXPLORATION MISSIONS (Sprint 2)
  // ============================================================================

  /**
   * Create a new exploration mission
   */
  async createExplorationMission(
    userId: string,
    params: CreateMissionParams
  ): Promise<{ success: boolean; mission?: ExplorationMission; error?: string }> {
    const {
      targetSystemId,
      missionType,
      probeCount,
      explorerCount,
      cartographerEquipped,
      explorationTechLevel,
      fleetMissionId,
    } = params

    // Validate mission type requirements
    const config = EXPLORATION_MISSION_CONFIG[missionType]
    if (config.requiresCartographer && !cartographerEquipped) {
      return {
        success: false,
        error: 'Cartography missions require a cartographer-equipped ship',
      }
    }

    // Calculate scan duration with tech reduction
    const baseDuration = config.baseDuration
    const techReduction = Math.max(0.7, 1.0 - explorationTechLevel * 0.03)
    const scanDuration = Math.floor(baseDuration * techReduction)

    // Calculate timing
    const now = new Date()
    const arrivesAt = new Date(now.getTime() + 60000) // 1 minute for testing
    const completesAt = new Date(arrivesAt.getTime() + scanDuration * 1000)

    // Create mission
    const { data, error } = await this.supabase
      .from('exploration_missions')
      .insert({
        user_id: userId,
        fleet_mission_id: fleetMissionId || null,
        target_system_id: targetSystemId,
        mission_type: missionType,
        probe_count: probeCount,
        explorer_count: explorerCount,
        cartographer_equipped: cartographerEquipped,
        exploration_tech_level: explorationTechLevel,
        started_at: now.toISOString(),
        arrives_at: arrivesAt.toISOString(),
        scan_duration_seconds: scanDuration,
        completes_at: completesAt.toISOString(),
        status: 'in_progress',
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, mission: data }
  }

  /**
   * Complete an exploration mission
   */
  async completeExplorationMission(
    userId: string,
    missionId: string
  ): Promise<CompleteMissionResult> {
    // Get mission
    const { data: mission, error: fetchError } = await this.supabase
      .from('exploration_missions')
      .select('*')
      .eq('id', missionId)
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .single()

    if (fetchError || !mission) {
      return {
        success: false,
        error: 'Mission not found or already completed',
      }
    }

    // Check if mission is ready
    if (new Date(mission.completes_at) > new Date()) {
      return {
        success: false,
        error: 'Mission not yet complete',
      }
    }

    // Calculate scan quality
    const scanQuality = this.calculateScanQuality({
      probeCount: mission.probe_count,
      explorerCount: mission.explorer_count,
      cartographerEquipped: mission.cartographer_equipped,
      explorationTechLevel: mission.exploration_tech_level,
      missionType: mission.mission_type,
    })

    // Get discovery level from mission type
    const missionConfig = EXPLORATION_MISSION_CONFIG[mission.mission_type as ExplorationMissionType]
    const discoveryLevel = missionConfig.minDiscoveryLevel

    // Apply discovery
    const { data: discoveryId, error: discError } = await this.supabase.rpc('discover_system', {
      p_user_id: userId,
      p_system_id: mission.target_system_id,
      p_discovery_level: discoveryLevel,
      p_discovered_via: 'exploration_ship',
      p_scan_quality: scanQuality,
    })

    // Get connected systems
    const { data: connections } = await this.supabase.rpc('get_connected_systems', {
      p_system_id: mission.target_system_id,
    })
    const connectedSystems = (connections || []).map(
      (c: { connected_system_id: string }) => c.connected_system_id
    )

    // Check first discoverer status
    const { data: firstDisc } = await this.supabase
      .from('first_discoveries')
      .select('*')
      .eq('solar_system_id', mission.target_system_id)
      .eq('user_id', userId)
      .single()

    const isFirstDiscoverer = !!firstDisc
    const bonusAvailable = !!firstDisc && !firstDisc.discovery_bonus_claimed

    // Roll for special findings
    const specialFindings = this.rollSpecialFindings(scanQuality)

    // Handle satellite deployment
    let satelliteDeployed = false
    if (mission.mission_type === 'satellite_deploy') {
      satelliteDeployed = await this.deploySatellite(
        userId,
        mission.target_system_id,
        mission.exploration_tech_level,
        scanQuality
      )
    }

    // Build results
    const results: ExplorationMissionResults = {
      discovery_level: discoveryLevel,
      scan_quality: scanQuality,
      systems_detected: connectedSystems,
      special_findings: specialFindings,
      is_first_discoverer: isFirstDiscoverer,
      satellite_deployed: satelliteDeployed,
    }

    // Claim first discovery bonus if applicable
    if (bonusAvailable) {
      const { data: bonusResult } = await this.supabase.rpc('claim_first_discovery_bonus', {
        p_user_id: userId,
        p_system_id: mission.target_system_id,
      })
      if (bonusResult?.success) {
        results.bonus_claimed = {
          type: bonusResult.bonus_type,
          amount: bonusResult.bonus_amount,
        }
      }
    }

    // Update mission status
    const { error: updateError } = await this.supabase
      .from('exploration_missions')
      .update({
        status: 'completed',
        results,
        updated_at: new Date().toISOString(),
      })
      .eq('id', missionId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return {
      success: true,
      discoveryLevel,
      scanQuality,
      systemsDetected: connectedSystems,
      specialFindings,
      isFirstDiscoverer,
      satelliteDeployed,
    }
  }

  /**
   * Get all exploration missions for a user
   */
  async getExplorationMissions(
    userId: string,
    status?: ExplorationMissionStatus
  ): Promise<ExplorationMission[]> {
    let query = this.supabase
      .from('exploration_missions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data } = await query

    return data || []
  }

  /**
   * Get a specific exploration mission
   */
  async getExplorationMission(
    userId: string,
    missionId: string
  ): Promise<ExplorationMission | null> {
    const { data } = await this.supabase
      .from('exploration_missions')
      .select('*')
      .eq('id', missionId)
      .eq('user_id', userId)
      .single()

    return data
  }

  /**
   * Cancel an exploration mission
   */
  async cancelExplorationMission(
    userId: string,
    missionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('exploration_missions')
      .update({
        status: 'failed',
        results: { cancelled: true } as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .eq('user_id', userId)
      .eq('status', 'in_progress')

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  // ============================================================================
  // SATELLITE MANAGEMENT
  // ============================================================================

  /**
   * Deploy a surveillance satellite
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
      .upsert(
        {
          user_id: userId,
          solar_system_id: systemId,
          sensor_range: sensorRange,
          scan_quality_bonus: scanQualityBonus,
          detection_bonus: detectionBonus,
          is_active: true,
          health: 100,
          deployed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,solar_system_id' }
      )

    return !error
  }

  /**
   * Get all satellites for a user
   */
  async getSatellites(userId: string): Promise<DeployedSatellite[]> {
    const { data } = await this.supabase
      .from('deployed_satellites')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('deployed_at', { ascending: false })

    return data || []
  }

  /**
   * Destroy a satellite
   */
  async destroySatellite(
    satelliteId: string,
    attackerId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('deployed_satellites')
      .update({
        is_active: false,
        health: 0,
        destroyed_at: new Date().toISOString(),
        destroyed_by: attackerId,
      })
      .eq('id', satelliteId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  // ============================================================================
  // SCAN QUALITY CALCULATION
  // ============================================================================

  /**
   * Calculate scan quality based on parameters
   */
  calculateScanQuality(params: CalculateScanQualityParams): number {
    const {
      probeCount,
      explorerCount,
      cartographerEquipped,
      explorationTechLevel,
      missionType,
    } = params

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
    if (cartographerEquipped) {
      quality += SCAN_QUALITY_LIMITS.CARTOGRAPHER
    }

    // Tech level bonus
    quality += explorationTechLevel * SCAN_QUALITY_LIMITS.TECH_PER_LEVEL

    return Math.min(quality, SCAN_QUALITY_LIMITS.MAX_QUALITY)
  }

  /**
   * Calculate scan duration with tech reduction
   */
  calculateScanDuration(
    missionType: ExplorationMissionType,
    techLevel: number
  ): number {
    const config = EXPLORATION_MISSION_CONFIG[missionType]
    const techReduction = Math.max(0.7, 1.0 - techLevel * 0.03)
    return Math.floor(config.baseDuration * techReduction)
  }

  /**
   * Roll for special findings
   */
  private rollSpecialFindings(scanQuality: number): SpecialFinding[] {
    const findings: SpecialFinding[] = []

    for (const config of SPECIAL_FINDING_CONFIG) {
      if (scanQuality < config.minQuality) continue

      const chance =
        config.baseChance + (scanQuality - config.minQuality) * config.qualityScaling
      if (Math.random() < chance) {
        findings.push(config.type)
      }
    }

    return findings
  }
}

export default ExplorationService
