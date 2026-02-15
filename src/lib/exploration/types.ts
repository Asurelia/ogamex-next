/**
 * Exploration System Types
 * Types for fog of war, discoveries, and system connections
 */

// ============================================================================
// DISCOVERY LEVELS
// ============================================================================

export type DiscoveryLevel = 'detected' | 'scanned' | 'explored' | 'mapped'

export type DiscoveryMethod =
  | 'probe'
  | 'exploration_ship'
  | 'data_card'
  | 'technology'
  | 'event'
  | 'starting'

// ============================================================================
// CONNECTION TYPES
// ============================================================================

export type ConnectionType = 'hyperlane' | 'wormhole' | 'jump_gate'

export interface SystemConnection {
  id: string
  systemAId: string
  systemBId: string
  connectionType: ConnectionType
  distance: number
  isStable: boolean
  expiresAt: string | null
  discoveredBy: string | null
  createdAt: string
}

// ============================================================================
// PLAYER DISCOVERIES
// ============================================================================

export interface PlayerDiscovery {
  id: string
  userId: string
  solarSystemId: string
  discoveryLevel: DiscoveryLevel
  discoveredAt: string
  discoveredVia: DiscoveryMethod
  scanQuality: number
  isFirstDiscoverer: boolean
  lastScannedAt: string
}

export interface FirstDiscovery {
  id: string
  solarSystemId: string
  userId: string
  discoveredAt: string
  discoveryBonusClaimed: boolean
  bonusType: string | null
  bonusAmount: number | null
}

// ============================================================================
// VISIBILITY
// ============================================================================

export type VisibilityLevel = 'hidden' | 'detected' | 'scanned' | 'explored' | 'mapped' | 'connected'

export interface VisibleSystem {
  systemId: string
  galaxyId: string
  galaxyIndex: number
  systemIndex: number
  visibility: VisibilityLevel
  discoveryLevel: DiscoveryLevel | null
  scanQuality: number

  // Info visible selon le niveau
  starType: string | null        // scanned+
  secondaryStarType: string | null
  planetCount: number | null     // scanned+
  habitableZoneInner: number | null
  habitableZoneOuter: number | null

  // Connexions (toujours visibles si le système est détecté+)
  connections: {
    targetSystemId: string
    targetGalaxyIndex: number
    targetSystemIndex: number
    connectionType: ConnectionType
    isVisible: boolean
  }[]

  // Infos colonisation (explored+ seulement)
  colonies: {
    colonyId: string
    userId: string
    username: string
    colonyName: string
    allianceTag: string | null
  }[] | null

  // Métadonnées
  isFirstDiscoverer: boolean
  discoveredAt: string | null
}

// ============================================================================
// EXPLORATION REQUESTS/RESPONSES
// ============================================================================

export interface DiscoverSystemRequest {
  galaxyIndex: number
  systemIndex: number
  discoveryLevel: DiscoveryLevel
  discoveredVia: DiscoveryMethod
  scanQuality?: number
}

export interface DiscoverSystemResponse {
  success: boolean
  discovery: PlayerDiscovery | null
  isFirstDiscoverer: boolean
  bonus: {
    type: string
    amount: number
  } | null
  newlyVisibleSystems: VisibleSystem[]
  error?: string
}

export interface GetVisibleSystemsRequest {
  galaxyIndex?: number  // Filtrer par galaxie
  includeConnections?: boolean
}

export interface GetVisibleSystemsResponse {
  systems: VisibleSystem[]
  totalDiscovered: number
  totalDetected: number
  firstDiscoveries: number
}

// ============================================================================
// CONNECTION GENERATION
// ============================================================================

export interface ConnectionGenerationConfig {
  minConnections: number
  maxConnections: number
  blackHoleBonus: number
  wormholeChance: number
  crossGalaxyChance: number
}

export const DEFAULT_CONNECTION_CONFIG: ConnectionGenerationConfig = {
  minConnections: 1,
  maxConnections: 6,
  blackHoleBonus: 3,
  wormholeChance: 0.02,
  crossGalaxyChance: 0.05
}

// ============================================================================
// EXPLORATION STATS
// ============================================================================

export interface ExplorationStats {
  totalSystemsDiscovered: number
  totalSystemsExplored: number
  totalSystemsMapped: number
  totalFirstDiscoveries: number
  totalBonusesClaimed: number
  galaxiesVisited: number

  byGalaxy: {
    galaxyIndex: number
    galaxyName: string
    systemsDiscovered: number
    systemsTotal: number
    percentExplored: number
  }[]

  recentDiscoveries: {
    systemId: string
    galaxyIndex: number
    systemIndex: number
    starType: string
    discoveredAt: string
    isFirst: boolean
  }[]
}

// ============================================================================
// SCAN QUALITY THRESHOLDS
// ============================================================================

export const SCAN_QUALITY_THRESHOLDS = {
  // Ce qui est visible à chaque niveau de qualité
  BASIC_INFO: 0,       // Toujours visible (type étoile si scanned+)
  PLANET_COUNT: 20,    // Nombre de planètes
  PLANET_TYPES: 40,    // Types de planètes
  PLANET_DETAILS: 60,  // Détails des planètes (taille, température)
  RESOURCE_HINTS: 80,  // Indices sur les ressources
  FULL_RESOURCES: 100  // Ressources exactes
} as const

// ============================================================================
// DISCOVERY LEVEL REQUIREMENTS
// ============================================================================

export const DISCOVERY_REQUIREMENTS = {
  detected: {
    minProbes: 1,
    minExplorationTech: 0,
    scanQuality: 0
  },
  scanned: {
    minProbes: 3,
    minExplorationTech: 1,
    scanQuality: 40
  },
  explored: {
    minProbes: 5,
    minExplorationTech: 3,
    scanQuality: 80
  },
  mapped: {
    minProbes: 10,
    minExplorationTech: 5,
    scanQuality: 100,
    requiresCartographer: true
  }
} as const

// ============================================================================
// FIRST DISCOVERY BONUSES
// ============================================================================

export const FIRST_DISCOVERY_BONUSES: Record<string, { type: string; amount: number }> = {
  black_hole: { type: 'dark_matter', amount: 100 },
  neutron_star: { type: 'dark_matter', amount: 50 },
  white_giant: { type: 'dark_matter', amount: 30 },
  blue_giant: { type: 'dark_matter', amount: 25 },
  red_giant: { type: 'dark_matter', amount: 20 },
  white_dwarf: { type: 'dark_matter', amount: 15 },
  binary_mixed: { type: 'dark_matter', amount: 10 },
  binary_yellow: { type: 'dark_matter', amount: 8 },
  binary_red: { type: 'dark_matter', amount: 8 },
  orange_dwarf: { type: 'dark_matter', amount: 5 },
  yellow_dwarf: { type: 'dark_matter', amount: 3 },
  red_dwarf: { type: 'dark_matter', amount: 2 }
}

// ============================================================================
// CARTOGRAPHY TYPES
// ============================================================================

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type CardType =
  | 'system_map'     // Carte d'un système
  | 'galaxy_map'     // Carte d'une galaxie entière
  | 'resource_map'   // Carte des ressources d'une zone
  | 'route_map'      // Carte d'une route sécurisée
  | 'wormhole_map'   // Carte d'un trou de ver
  | 'special_map'    // Carte spéciale (événement)

export interface DataCardPayload {
  systems?: string[]
  galaxyIndex?: number
  quality: number
  resources?: Record<string, number>
  specialFeatures?: string[]
  routeSystemIds?: string[]
  wormholeId?: string
  expiresAt?: string
}

export interface CartographyItem {
  id: string
  ownerId: string | null
  cardType: CardType
  rarity: CardRarity
  name: string
  description: string | null
  dataPayload: DataCardPayload
  createdBy: string | null
  createdAt: string
  createdFromDiscoveryId: string | null
  creationCost: CardCreationCost | null
  isConsumed: boolean
  consumedBy: string | null
  consumedAt: string | null
  isTradeable: boolean
  tradeRestrictions: TradeRestrictions | null
}

export interface CardCreationCost {
  metal: number
  crystal: number
  deuterium: number
  dark_matter: number
  time_seconds: number
}

export interface TradeRestrictions {
  min_level?: number
  alliance_only?: boolean
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================

export type InventoryItemType =
  | 'data_card'
  | 'cartographer'
  | 'probe_pack'
  | 'scanner_module'
  | 'consumable'
  | 'artifact'

export type StorageLocation = 'inventory' | 'vault' | 'market' | 'escrow'

export type AcquisitionMethod =
  | 'purchase'
  | 'craft'
  | 'drop'
  | 'trade'
  | 'event'
  | 'exploration'
  | 'reward'

export interface InventoryItem {
  id: string
  userId: string
  itemType: InventoryItemType
  itemId: string | null
  quantity: number
  acquiredAt: string
  acquiredVia: AcquisitionMethod | null
  storageLocation: StorageLocation

  // Joined data
  dataCard?: CartographyItem
}

// ============================================================================
// VAULT TYPES
// ============================================================================

export interface PlayerVault {
  id: string
  userId: string
  maxSlots: number
  usedSlots: number
  vaultLevel: number
  nextUpgradeCost: VaultUpgradeCost
  createdAt: string
  updatedAt: string
}

export interface VaultUpgradeCost {
  metal: number
  crystal: number
  deuterium: number
  slots_gained: number
}

// ============================================================================
// MARKET TYPES
// ============================================================================

export type PriceType = 'fixed' | 'auction'
export type ListingStatus = 'active' | 'sold' | 'expired' | 'cancelled'

export interface MarketListing {
  id: string
  sellerId: string
  sellerUsername?: string
  inventoryItemId: string
  itemType: string
  itemRarity: CardRarity | null
  priceType: PriceType
  priceMetal: number
  priceCrystal: number
  priceDeuterium: number
  priceDarkMatter: number
  currentBid: number
  currentBidderId: string | null
  minBidIncrement: number
  listedAt: string
  expiresAt: string
  status: ListingStatus
  buyerId: string | null
  soldAt: string | null
  finalPrice: Record<string, number> | null

  // Joined data
  item?: InventoryItem
}

export interface MarketBid {
  id: string
  listingId: string
  bidderId: string
  bidderUsername?: string
  bidAmount: number
  bidAt: string
  isWinning: boolean
}

// ============================================================================
// CARD CREATION QUEUE
// ============================================================================

export type CardCreationStatus = 'in_progress' | 'completed' | 'cancelled'

export interface CardCreationQueueItem {
  id: string
  userId: string
  discoveryId: string
  cardType: CardType
  targetRarity: CardRarity
  costMetal: number
  costCrystal: number
  costDeuterium: number
  costDarkMatter: number
  startedAt: string
  completesAt: string
  status: CardCreationStatus
  createdCardId: string | null
  completedAt: string | null
}

// ============================================================================
// CARD CREATION COSTS
// ============================================================================

export const CARD_CREATION_COSTS: Record<CardRarity, CardCreationCost> = {
  common: { metal: 1000, crystal: 500, deuterium: 200, dark_matter: 0, time_seconds: 1800 },
  uncommon: { metal: 5000, crystal: 2500, deuterium: 1000, dark_matter: 0, time_seconds: 7200 },
  rare: { metal: 20000, crystal: 10000, deuterium: 5000, dark_matter: 10, time_seconds: 28800 },
  epic: { metal: 100000, crystal: 50000, deuterium: 25000, dark_matter: 50, time_seconds: 86400 },
  legendary: { metal: 500000, crystal: 250000, deuterium: 100000, dark_matter: 200, time_seconds: 259200 }
}

export const CARD_ESTIMATED_VALUES: Record<CardRarity, { minMetal: number; maxMetal: number; minCrystal: number; maxCrystal: number }> = {
  common: { minMetal: 500, maxMetal: 2000, minCrystal: 250, maxCrystal: 1000 },
  uncommon: { minMetal: 2000, maxMetal: 10000, minCrystal: 1000, maxCrystal: 5000 },
  rare: { minMetal: 10000, maxMetal: 50000, minCrystal: 5000, maxCrystal: 25000 },
  epic: { minMetal: 50000, maxMetal: 250000, minCrystal: 25000, maxCrystal: 125000 },
  legendary: { minMetal: 250000, maxMetal: 2000000, minCrystal: 125000, maxCrystal: 1000000 }
}

// ============================================================================
// STAR TYPE TO RARITY MAPPING
// ============================================================================

export const STAR_TYPE_RARITY: Record<string, CardRarity> = {
  black_hole: 'legendary',
  neutron_star: 'epic',
  white_giant: 'rare',
  blue_giant: 'rare',
  red_giant: 'uncommon',
  white_dwarf: 'uncommon',
  binary_mixed: 'uncommon',
  binary_yellow: 'uncommon',
  binary_red: 'uncommon',
  orange_dwarf: 'common',
  yellow_dwarf: 'common',
  red_dwarf: 'common'
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateDataCardRequest {
  discoveryId: string
  cardType: CardType
}

export interface CreateDataCardResponse {
  success: boolean
  queueItem?: CardCreationQueueItem
  error?: string
  estimatedCompletion?: string
}

export interface UseDataCardRequest {
  cardId: string
}

export interface UseDataCardResponse {
  success: boolean
  discoveries?: PlayerDiscovery[]
  error?: string
}

export interface ListMarketRequest {
  itemType?: InventoryItemType
  rarity?: CardRarity
  priceType?: PriceType
  maxPriceMetal?: number
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'ending_soon'
  page?: number
  limit?: number
}

export interface CreateListingRequest {
  inventoryItemId: string
  priceType: PriceType
  priceMetal: number
  priceCrystal: number
  priceDeuterium: number
  priceDarkMatter?: number
  durationHours: number
  minBidIncrement?: number
}

export interface PlaceBidRequest {
  listingId: string
  bidAmount: number
}

export interface VaultDepositRequest {
  inventoryItemId: string
}

export interface VaultWithdrawRequest {
  inventoryItemId: string
}

export interface VaultUpgradeResponse {
  success: boolean
  newLevel?: number
  newMaxSlots?: number
  nextUpgradeCost?: VaultUpgradeCost
  error?: string
}

// ============================================================================
// EXPLORATION MISSION TYPES (Sprint 2)
// ============================================================================

export type ExplorationMissionType =
  | 'quick_scan'       // 1h, basic detection
  | 'deep_scan'        // 4h, full exploration
  | 'cartography'      // 8h, can create data card
  | 'satellite_deploy' // Permanent surveillance

export type ExplorationMissionStatus =
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'intercepted'

// ============================================================================
// MISSION CONFIG
// ============================================================================

export interface ExplorationMissionConfig {
  type: ExplorationMissionType
  baseDuration: number        // Base duration in seconds
  baseQuality: number         // Base scan quality (0-100)
  minDiscoveryLevel: DiscoveryLevel
  canCreateDataCard: boolean
  requiresCartographer: boolean
}

export const EXPLORATION_MISSION_CONFIG: Record<ExplorationMissionType, ExplorationMissionConfig> = {
  quick_scan: {
    type: 'quick_scan',
    baseDuration: 3600,        // 1 hour
    baseQuality: 20,
    minDiscoveryLevel: 'detected',
    canCreateDataCard: false,
    requiresCartographer: false,
  },
  deep_scan: {
    type: 'deep_scan',
    baseDuration: 14400,       // 4 hours
    baseQuality: 50,
    minDiscoveryLevel: 'explored',
    canCreateDataCard: false,
    requiresCartographer: false,
  },
  cartography: {
    type: 'cartography',
    baseDuration: 28800,       // 8 hours
    baseQuality: 80,
    minDiscoveryLevel: 'mapped',
    canCreateDataCard: true,
    requiresCartographer: true,
  },
  satellite_deploy: {
    type: 'satellite_deploy',
    baseDuration: 7200,        // 2 hours
    baseQuality: 30,
    minDiscoveryLevel: 'scanned',
    canCreateDataCard: false,
    requiresCartographer: false,
  },
}

// ============================================================================
// SCAN QUALITY BONUSES
// ============================================================================

export const SCAN_QUALITY_LIMITS = {
  PROBE_PER_UNIT: 2,
  PROBE_MAX: 20,
  EXPLORER_PER_UNIT: 5,
  EXPLORER_MAX: 25,
  CARTOGRAPHER: 15,
  TECH_PER_LEVEL: 2,
  MAX_QUALITY: 100,
}

// ============================================================================
// SPECIAL FINDINGS
// ============================================================================

export type SpecialFinding =
  | 'ancient_ruins'
  | 'resource_deposit'
  | 'wormhole_signature'
  | 'artifact_site'
  | 'pirate_cache'
  | 'derelict_ship'
  | 'anomaly'

export interface SpecialFindingConfig {
  type: SpecialFinding
  minQuality: number      // Minimum scan quality to find
  baseChance: number      // Base probability (0-1)
  qualityScaling: number  // How much quality affects chance
}

export const SPECIAL_FINDING_CONFIG: SpecialFindingConfig[] = [
  { type: 'ancient_ruins', minQuality: 40, baseChance: 0.05, qualityScaling: 0.001 },
  { type: 'resource_deposit', minQuality: 30, baseChance: 0.08, qualityScaling: 0.002 },
  { type: 'wormhole_signature', minQuality: 60, baseChance: 0.03, qualityScaling: 0.0005 },
  { type: 'artifact_site', minQuality: 70, baseChance: 0.02, qualityScaling: 0.0003 },
  { type: 'pirate_cache', minQuality: 20, baseChance: 0.10, qualityScaling: 0.002 },
  { type: 'derelict_ship', minQuality: 50, baseChance: 0.04, qualityScaling: 0.001 },
  { type: 'anomaly', minQuality: 80, baseChance: 0.01, qualityScaling: 0.0002 },
]

// ============================================================================
// DATABASE TYPES FOR EXPLORATION MISSIONS
// ============================================================================

export interface ExplorationMission {
  id: string
  user_id: string
  fleet_mission_id: string | null
  target_system_id: string
  mission_type: ExplorationMissionType
  probe_count: number
  explorer_count: number
  cartographer_equipped: boolean
  exploration_tech_level: number
  started_at: string
  arrives_at: string
  scan_duration_seconds: number
  completes_at: string
  status: ExplorationMissionStatus
  results: ExplorationMissionResults | null
  created_at: string
  updated_at: string
}

export interface ExplorationMissionResults {
  discovery_level: DiscoveryLevel
  scan_quality: number
  systems_detected: string[] | null
  special_findings: SpecialFinding[]
  is_first_discoverer: boolean
  satellite_deployed?: boolean
  bonus_claimed?: {
    type: string
    amount: number
  }
}

export interface DeployedSatellite {
  id: string
  user_id: string
  solar_system_id: string
  sensor_range: number
  scan_quality_bonus: number
  detection_bonus: number
  is_active: boolean
  health: number
  destroyed_at: string | null
  destroyed_by: string | null
  deployed_at: string
  deployed_via: string | null
}

// ============================================================================
// EXPLORATION MISSION REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateExplorationMissionRequest {
  target_system_id: string
  mission_type: ExplorationMissionType
  fleet_composition: {
    espionage_probe?: number
    pathfinder?: number
  }
}

export interface ExplorationMissionResponse {
  id: string
  mission_type: ExplorationMissionType
  target_system: {
    id: string
    galaxy: number
    system: number
    star_type?: string
  }
  status: ExplorationMissionStatus
  probe_count: number
  explorer_count: number
  started_at: string
  arrives_at: string
  completes_at: string
  time_remaining_seconds: number
  results?: ExplorationMissionResults
}

export interface SatelliteResponse {
  id: string
  solar_system_id: string
  galaxy: number
  system: number
  star_type?: string
  sensor_range: number
  scan_quality_bonus: number
  detection_bonus: number
  is_active: boolean
  health: number
  deployed_at: string
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

export interface CalculateScanQualityParams {
  probeCount: number
  explorerCount: number
  cartographerEquipped: boolean
  explorationTechLevel: number
  missionType: ExplorationMissionType
}

export interface CreateMissionParams {
  targetSystemId: string
  missionType: ExplorationMissionType
  probeCount: number
  explorerCount: number
  cartographerEquipped: boolean
  explorationTechLevel: number
  fleetMissionId?: string
}

export interface CompleteMissionResult {
  success: boolean
  discoveryLevel?: DiscoveryLevel
  scanQuality?: number
  systemsDetected?: string[]
  specialFindings?: SpecialFinding[]
  isFirstDiscoverer?: boolean
  satelliteDeployed?: boolean
  error?: string
}
