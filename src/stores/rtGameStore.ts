/**
 * Real-Time Game Store (Zustand)
 *
 * Manages all real-time game state synchronized from Colyseus.
 * UI components read from this store; actions send messages to Colyseus.
 */

import { create } from 'zustand'
import { sendMessage } from '@/lib/colyseus/client'

// ============================================================================
// TYPES
// ============================================================================

export interface ShipData {
  id: string
  ownerId: string
  ownerName: string
  shipTypeId: string
  faction: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  rx: number
  ry: number
  rz: number
  speed: number
  maxSpeed: number
  state: number
  targetId: string
  hp: number
  hpMax: number
  shield: number
  shieldMax: number
  armor: number
  armorMax: number
  capacitor: number
  capacitorMax: number
  isDocked: boolean
  isNpc: boolean
}

export interface AsteroidData {
  id: string
  x: number
  y: number
  z: number
  oreType: string
  volume: number
  maxVolume: number
  radius: number
}

export interface StationData {
  id: string
  name: string
  stationType: string
  x: number
  y: number
  z: number
}

export interface ChatMessageData {
  channel: string
  senderId: string
  senderName: string
  content: string
  timestamp: number
}

export interface DamageEvent {
  attackerId: string
  targetId: string
  shieldDamage: number
  armorDamage: number
  hullDamage: number
  damageType: string
  isCritical: boolean
  timestamp: number
}

export interface FleetMemberData {
  id: string
  name: string
  shipType: string
  status: 'active' | 'warping' | 'docked' | 'destroyed'
  shieldPercent: number
  armorPercent: number
  hullPercent: number
}

export interface MarketOrder {
  id: string
  itemName: string
  price: number
  quantity: number
  type: 'buy' | 'sell'
  owner: string
  isOwn: boolean
}

export interface SkillData {
  id: string
  name: string
  category: string
  level: number
  maxLevel: number
  currentSP: number
  requiredSP: number
  training: boolean
}

export interface SkillQueueItem {
  skillId: string
  skillName: string
  targetLevel: number
  remainingSeconds: number
}

export interface ModuleSlot {
  id: string
  name: string
  type: 'high' | 'mid' | 'low'
  active: boolean
  icon: string
}

export interface ShipFitting {
  shipName: string
  shipType: string
  highSlots: ModuleSlot[]
  midSlots: ModuleSlot[]
  lowSlots: ModuleSlot[]
  dps: number
  ehp: number
  speed: number
  capacitor: number
  capacitorMax: number
  cpuUsed: number
  cpuMax: number
  powergridUsed: number
  powergridMax: number
}

export interface CargoItem {
  id: string
  name: string
  quantity: number
  volume: number
  category: 'ore' | 'mineral' | 'module' | 'ammo' | 'misc'
}

export interface NotificationData {
  id: string
  type: 'info' | 'warning' | 'danger' | 'success'
  title: string
  message: string
  timestamp: number
}

export interface CloneData {
  id: string
  cloneType: 'jump' | 'medical'
  cloneName: string
  stationName?: string
  stationId?: string
  jumpCooldownUntil?: string
  implants?: Array<{ slot: number; name?: string; implantTypeId?: string }>
}

export interface ImplantData {
  slot: number
  implantTypeId: string
  name?: string
  description?: string
}

export interface ImplantSetBonus {
  type: string
  totalBonus: number
}

export interface LockedTarget {
  id: string
  name: string
  type: string
  shieldPercent: number
  armorPercent: number
  hullPercent: number
  distance: number
}

// --- Corporation ---

export interface CorpData {
  id: string
  name: string
  ticker: string
  description: string
  ceoId: string
  taxRate: number
  memberCount: number
  isRecruiting: boolean
}

export interface CorpMemberData {
  userId: string
  userName: string
  role: string
  title: string
}

export interface CorpApplicationData {
  id: string
  applicantId: string
  applicantName: string
  message: string
  status: string
}

export interface CorpWalletJournalEntry {
  division: number
  amount: number
  balanceAfter: number
  refType: string
  description: string
  actorId: string
  timestamp: number
}

// --- Industry ---

export interface BlueprintData {
  id: string
  itemTypeId: string
  itemName: string
  isOriginal: boolean
  runsRemaining: number
  materialEfficiency: number
  timeEfficiency: number
  techLevel: number
}

export interface IndustryJobData {
  id: string
  activity: string
  outputItemName: string
  outputQuantity: number
  durationSeconds: number
  startedAt: string
  endsAt: string
  completed: boolean
}

// --- Planetary Interaction ---

export interface ColonyData {
  id: string
  systemId: string
  planetIndex: number
  colonyName: string
  commandCenterLevel: number
  powerUsed: number
  powerCapacity: number
  cpuUsed: number
  cpuCapacity: number
}

export interface ColonyBuildingData {
  id: string
  buildingType: string
  level: number
  positionX: number
  positionY: number
  resourceType: string
  schematicId: string
}

export interface ColonyRouteData {
  sourceId: string
  destId: string
  itemTypeId: string
  quantityPerCycle: number
}

// --- Scanner ---

export interface ScanResultData {
  signatureId: string
  signatureType: string
  scanStrength: number
  resolved: boolean
  position: { x: number; y: number; z: number }
}

// --- Contracts ---

export interface ContractData {
  id: string
  issuerId: string
  issuerName: string
  contractType: string
  status: string
  title: string
  price: number
  reward: number
  collateral: number
  volume: number
  expiresAt: string
}

// --- Sovereignty ---

export interface SovereigntyInfoData {
  systemId: string
  ownerCorpName: string
  sovLevel: number
  militaryIndex: number
  industrialIndex: number
  strategicIndex: number
}

export interface SovStructureData {
  id: string
  structureType: string
  ownerCorpName: string
  hp: number
  shield: number
  state: string
  vulnerabilityStartHour: number
  vulnerabilityDurationHours: number
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface RTGameState {
  // Connection
  connected: boolean
  setConnected: (v: boolean) => void

  // System info
  systemId: string
  systemName: string
  securityLevel: number
  setSystemInfo: (id: string, name: string, sec: number) => void

  // My ship
  myShipId: string
  setMyShipId: (id: string) => void
  getMyShip: () => ShipData | undefined

  // Entities
  ships: Map<string, ShipData>
  asteroids: Map<string, AsteroidData>
  stations: Map<string, StationData>

  // Selection
  selectedTargetId: string | null
  setSelectedTarget: (id: string | null) => void

  // Chat
  chatMessages: ChatMessageData[]
  addChatMessage: (msg: ChatMessageData) => void

  // Damage events (for VFX)
  recentDamage: DamageEvent[]
  addDamageEvent: (evt: DamageEvent) => void

  // Fleet
  fleetMembers: FleetMemberData[]
  fleetFormation: string
  setFleetMembers: (members: FleetMemberData[]) => void
  setFleetFormation: (formation: string) => void

  // Market
  marketOrders: MarketOrder[]
  setMarketOrders: (orders: MarketOrder[]) => void

  // Skills
  skills: SkillData[]
  skillQueue: SkillQueueItem[]
  setSkills: (skills: SkillData[]) => void
  setSkillQueue: (queue: SkillQueueItem[]) => void

  // Fitting
  fitting: ShipFitting | null
  setFitting: (fitting: ShipFitting | null) => void

  // Locked targets
  lockedTargets: LockedTarget[]
  setLockedTargets: (targets: LockedTarget[]) => void

  // HUD modules
  modules: ModuleSlot[]
  setModules: (modules: ModuleSlot[]) => void

  // Cargo
  cargo: CargoItem[]
  setCargo: (items: CargoItem[]) => void
  addCargoItem: (item: CargoItem) => void

  // Wallet
  walletBalance: number
  setWalletBalance: (v: number) => void

  // Notifications
  notifications: NotificationData[]
  addNotification: (n: NotificationData) => void
  clearNotification: (id: string) => void

  // Docking state
  isDocked: boolean
  dockedStationId: string
  setDockingState: (docked: boolean, stationId?: string) => void

  // Warp VFX
  warpActive: boolean
  setWarpActive: (v: boolean) => void

  // Route (cross-system navigation)
  route: string[]
  routeDestination: string
  setRoute: (path: string[]) => void
  setRouteDestination: (name: string) => void
  warpCrossSystem: (targetSystemId: string) => void

  // Entity sync (called by state-sync bridge)
  setShip: (id: string, data: ShipData) => void
  removeShip: (id: string) => void
  setAsteroid: (id: string, data: AsteroidData) => void
  removeAsteroid: (id: string) => void
  setStation: (id: string, data: StationData) => void
  removeStation: (id: string) => void

  // Actions (send to Colyseus)
  navigate: (x: number, y: number, z: number) => void
  warpTo: (targetId: string) => void
  orbit: (targetId: string, range?: number) => void
  approach: (targetId: string) => void
  attack: (targetId: string) => void
  stopAttack: () => void
  mine: (asteroidId: string) => void
  stopMine: () => void
  dock: (stationId: string) => void
  undock: () => void
  stop: () => void
  chat: (channel: string, content: string) => void
  fleetCommand: (command: string) => void
  placeOrder: (itemName: string, price: number, quantity: number, type: 'buy' | 'sell') => void
  trainSkill: (skillId: string) => void
  toggleModule: (moduleId: string) => void
  lockTarget: (targetId: string) => void
  unlockTarget: (targetId: string) => void

  // Clones
  clones: CloneData[]
  medicalCloneStationId: string
  setClones: (clones: CloneData[]) => void
  setMedicalCloneStation: (stationId: string) => void
  cloneJump: (cloneId: string) => void
  cloneInstall: () => void
  cloneDestroy: (cloneId: string) => void
  cloneSetMedical: () => void

  // Implants
  activeImplants: ImplantData[]
  implantSetBonuses: ImplantSetBonus[]
  setActiveImplants: (implants: ImplantData[]) => void
  setImplantSetBonuses: (bonuses: ImplantSetBonus[]) => void
  implantRemove: (slot: number) => void

  // Corporation
  corpData: CorpData | null
  corpMembers: CorpMemberData[]
  corpApplications: CorpApplicationData[]
  corpWalletBalances: number[]
  corpWalletJournal: CorpWalletJournalEntry[]
  setCorpData: (data: CorpData | null) => void
  setCorpMembers: (members: CorpMemberData[]) => void
  setCorpApplications: (apps: CorpApplicationData[]) => void
  setCorpWalletBalances: (balances: number[]) => void
  setCorpWalletJournal: (entries: CorpWalletJournalEntry[]) => void
  corpCreate: (name: string, ticker: string) => void
  corpLeave: () => void
  corpAcceptApplication: (applicationId: string) => void
  corpRejectApplication: (applicationId: string) => void
  corpDeposit: (amount: number) => void
  corpSetRole: (userId: string, role: string) => void
  corpSetTax: (rate: number) => void
  corpSetRecruiting: (v: boolean) => void
  corpApply: (corpId: string, message: string) => void
  corpKick: (userId: string) => void

  // Industry
  blueprints: BlueprintData[]
  industryJobs: IndustryJobData[]
  setBlueprints: (bps: BlueprintData[]) => void
  setIndustryJobs: (jobs: IndustryJobData[]) => void
  industryStartJob: (blueprintId: string, activity: string) => void
  industryDeliverJob: (jobId: string) => void
  industryCancelJob: (jobId: string) => void

  // Planetary Interaction
  colonies: ColonyData[]
  selectedColony: ColonyData | null
  colonyBuildings: ColonyBuildingData[]
  colonyRoutes: ColonyRouteData[]
  setColonies: (colonies: ColonyData[]) => void
  setSelectedColony: (colony: ColonyData | null) => void
  setColonyBuildings: (buildings: ColonyBuildingData[]) => void
  setColonyRoutes: (routes: ColonyRouteData[]) => void
  piCreateColony: () => void
  piPlaceBuilding: (buildingType: string) => void
  piRemoveBuilding: (buildingId: string) => void

  // Scanner
  scanResults: ScanResultData[]
  scanProbeCount: number
  setScanResults: (results: ScanResultData[]) => void
  setScanProbeCount: (count: number) => void
  scanLaunchProbes: (radius: number) => void
  scanInitiate: () => void

  // Contracts
  browseContracts: ContractData[]
  myContracts: ContractData[]
  setBrowseContracts: (contracts: ContractData[]) => void
  setMyContracts: (contracts: ContractData[]) => void
  contractCreate: (params: { contractType: string; title: string; price: number; reward?: number; collateral?: number }) => void
  contractAccept: (contractId: string) => void
  contractBrowse: (typeFilter?: string) => void
  contractGetMine: () => void
  contractBid: (contractId: string, amount: number) => void
  contractCancel: (contractId: string) => void

  // Sovereignty
  sovereigntyInfo: SovereigntyInfoData | null
  sovStructures: SovStructureData[]
  setSovereigntyInfo: (info: SovereigntyInfoData | null) => void
  setSovStructures: (structures: SovStructureData[]) => void
  sovDeployStructure: (structureType: string) => void
  sovGetInfo: () => void

  // Reset
  reset: () => void
}

// ============================================================================
// STORE
// ============================================================================

const initialState = {
  connected: false,
  systemId: '',
  systemName: '',
  securityLevel: 1.0,
  myShipId: '',
  ships: new Map<string, ShipData>(),
  asteroids: new Map<string, AsteroidData>(),
  stations: new Map<string, StationData>(),
  selectedTargetId: null as string | null,
  chatMessages: [] as ChatMessageData[],
  recentDamage: [] as DamageEvent[],
  fleetMembers: [] as FleetMemberData[],
  fleetFormation: 'spread',
  marketOrders: [] as MarketOrder[],
  skills: [] as SkillData[],
  skillQueue: [] as SkillQueueItem[],
  fitting: null as ShipFitting | null,
  lockedTargets: [] as LockedTarget[],
  modules: [] as ModuleSlot[],
  cargo: [] as CargoItem[],
  walletBalance: 0,
  notifications: [] as NotificationData[],
  isDocked: false,
  dockedStationId: '',
  warpActive: false,
  route: [] as string[],
  routeDestination: '',
  clones: [] as CloneData[],
  medicalCloneStationId: '',
  activeImplants: [] as ImplantData[],
  implantSetBonuses: [] as ImplantSetBonus[],
  corpData: null as CorpData | null,
  corpMembers: [] as CorpMemberData[],
  corpApplications: [] as CorpApplicationData[],
  corpWalletBalances: [] as number[],
  corpWalletJournal: [] as CorpWalletJournalEntry[],
  blueprints: [] as BlueprintData[],
  industryJobs: [] as IndustryJobData[],
  colonies: [] as ColonyData[],
  selectedColony: null as ColonyData | null,
  colonyBuildings: [] as ColonyBuildingData[],
  colonyRoutes: [] as ColonyRouteData[],
  scanResults: [] as ScanResultData[],
  scanProbeCount: 0,
  browseContracts: [] as ContractData[],
  myContracts: [] as ContractData[],
  sovereigntyInfo: null as SovereigntyInfoData | null,
  sovStructures: [] as SovStructureData[],
}

export const useRTGameStore = create<RTGameState>((set, get) => ({
  ...initialState,

  setConnected: (v) => set({ connected: v }),

  setSystemInfo: (id, name, sec) => set({ systemId: id, systemName: name, securityLevel: sec }),

  setMyShipId: (id) => set({ myShipId: id }),

  getMyShip: () => get().ships.get(get().myShipId),

  setSelectedTarget: (id) => set({ selectedTargetId: id }),

  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages.slice(-99), msg], // Keep last 100
  })),

  addDamageEvent: (evt) => set((state) => ({
    recentDamage: [...state.recentDamage.slice(-19), evt], // Keep last 20
  })),

  // Entity sync - mutate in place and return same Map reference for perf.
  // Components that need to re-render on entity changes should use the
  // entityVersion counter as a dependency, or subscribe to specific entity IDs.
  // This avoids creating a new Map (O(n) copy) on every 20Hz position update.
  setShip: (id, data) => {
    const ships = get().ships
    ships.set(id, data)
    set({ ships })
  },

  removeShip: (id) => {
    const ships = get().ships
    ships.delete(id)
    set({ ships })
  },

  setAsteroid: (id, data) => {
    const asteroids = get().asteroids
    asteroids.set(id, data)
    set({ asteroids })
  },

  removeAsteroid: (id) => {
    const asteroids = get().asteroids
    asteroids.delete(id)
    set({ asteroids })
  },

  setStation: (id, data) => {
    const stations = get().stations
    stations.set(id, data)
    set({ stations })
  },

  removeStation: (id) => {
    const stations = get().stations
    stations.delete(id)
    set({ stations })
  },

  // Fleet
  setFleetMembers: (members) => set({ fleetMembers: members }),
  setFleetFormation: (formation) => set({ fleetFormation: formation }),

  // Market
  setMarketOrders: (orders) => set({ marketOrders: orders }),

  // Skills
  setSkills: (skills) => set({ skills }),
  setSkillQueue: (queue) => set({ skillQueue: queue }),

  // Fitting
  setFitting: (fitting) => set({ fitting }),

  // Locked targets
  setLockedTargets: (targets) => set({ lockedTargets: targets }),

  // HUD modules
  setModules: (modules) => set({ modules }),

  // Cargo
  setCargo: (items) => set({ cargo: items }),
  addCargoItem: (item) => set((state) => ({
    cargo: [...state.cargo, item],
  })),

  // Wallet
  setWalletBalance: (v) => set({ walletBalance: v }),

  // Notifications
  addNotification: (n) => set((state) => ({
    notifications: [...state.notifications.slice(-19), n],
  })),
  clearNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id),
  })),

  // Docking
  setDockingState: (docked, stationId) => set({ isDocked: docked, dockedStationId: stationId ?? '' }),

  // Warp VFX
  setWarpActive: (v) => set({ warpActive: v }),

  // Route
  setRoute: (path) => set({ route: path }),
  setRouteDestination: (name) => set({ routeDestination: name }),
  warpCrossSystem: (targetSystemId) => sendMessage('warp_cross_system', { targetSystemId }),

  // Actions
  navigate: (x, y, z) => sendMessage('navigate', { x, y, z }),
  warpTo: (targetId) => sendMessage('warp', { targetEntityId: targetId }),
  orbit: (targetId, range = 5000) => sendMessage('orbit', { targetId, range }),
  approach: (targetId) => sendMessage('navigate', { targetId }),
  attack: (targetId) => sendMessage('attack', { targetId }),
  stopAttack: () => sendMessage('stop_attack'),
  mine: (asteroidId) => sendMessage('mine', { asteroidId }),
  stopMine: () => sendMessage('stop_mine'),
  dock: (stationId) => sendMessage('dock', { stationId }),
  undock: () => sendMessage('undock'),
  stop: () => sendMessage('stop'),
  chat: (channel, content) => sendMessage('chat', { channel, content }),
  fleetCommand: (command) => sendMessage('fleet_command', { command }),
  placeOrder: (itemName, price, quantity, type) => sendMessage('market_order', { itemName, price, quantity, type }),
  trainSkill: (skillId) => sendMessage('train_skill', { skillId }),
  toggleModule: (moduleId) => sendMessage('toggle_module', { moduleId }),
  lockTarget: (targetId) => sendMessage('lock_target', { targetId }),
  unlockTarget: (targetId) => sendMessage('unlock_target', { targetId }),

  // Clones
  setClones: (clones) => set({ clones }),
  setMedicalCloneStation: (stationId) => set({ medicalCloneStationId: stationId }),
  cloneJump: (cloneId) => sendMessage('clone_jump', { cloneId }),
  cloneInstall: () => sendMessage('clone_install'),
  cloneDestroy: (cloneId) => sendMessage('clone_destroy', { cloneId }),
  cloneSetMedical: () => sendMessage('clone_set_medical'),

  // Implants
  setActiveImplants: (implants) => set({ activeImplants: implants }),
  setImplantSetBonuses: (bonuses) => set({ implantSetBonuses: bonuses }),
  implantRemove: (slot) => sendMessage('implant_remove', { slot }),

  // Corporation
  setCorpData: (data) => set({ corpData: data }),
  setCorpMembers: (members) => set({ corpMembers: members }),
  setCorpApplications: (apps) => set({ corpApplications: apps }),
  setCorpWalletBalances: (balances) => set({ corpWalletBalances: balances }),
  setCorpWalletJournal: (entries) => set({ corpWalletJournal: entries }),
  corpCreate: (name, ticker) => sendMessage('corp_create', { name, ticker }),
  corpLeave: () => sendMessage('corp_leave'),
  corpAcceptApplication: (applicationId) => sendMessage('corp_accept_application', { applicationId }),
  corpRejectApplication: (applicationId) => sendMessage('corp_reject_application', { applicationId }),
  corpDeposit: (amount) => sendMessage('corp_deposit', { amount }),
  corpSetRole: (userId, role) => sendMessage('corp_set_role', { userId, role }),
  corpSetTax: (rate) => sendMessage('corp_set_tax', { rate }),
  corpSetRecruiting: (v) => sendMessage('corp_set_recruiting', { isRecruiting: v }),
  corpApply: (corpId, message) => sendMessage('corp_apply', { corpId, message }),
  corpKick: (userId) => sendMessage('corp_kick', { userId }),

  // Industry
  setBlueprints: (bps) => set({ blueprints: bps }),
  setIndustryJobs: (jobs) => set({ industryJobs: jobs }),
  industryStartJob: (blueprintId, activity) => sendMessage('industry_start_job', { blueprintId, activity }),
  industryDeliverJob: (jobId) => sendMessage('industry_deliver_job', { jobId }),
  industryCancelJob: (jobId) => sendMessage('industry_cancel_job', { jobId }),

  // Planetary Interaction
  setColonies: (colonies) => set({ colonies }),
  setSelectedColony: (colony) => set({ selectedColony: colony }),
  setColonyBuildings: (buildings) => set({ colonyBuildings: buildings }),
  setColonyRoutes: (routes) => set({ colonyRoutes: routes }),
  piCreateColony: () => sendMessage('pi_create_colony'),
  piPlaceBuilding: (buildingType) => sendMessage('pi_place_building', { buildingType }),
  piRemoveBuilding: (buildingId) => sendMessage('pi_remove_building', { buildingId }),

  // Scanner
  setScanResults: (results) => set({ scanResults: results }),
  setScanProbeCount: (count) => set({ scanProbeCount: count }),
  scanLaunchProbes: (radius) => sendMessage('scan_launch_probes', { radius }),
  scanInitiate: () => sendMessage('scan_initiate'),

  // Contracts
  setBrowseContracts: (contracts) => set({ browseContracts: contracts }),
  setMyContracts: (contracts) => set({ myContracts: contracts }),
  contractCreate: (params) => sendMessage('contract_create', params),
  contractAccept: (contractId) => sendMessage('contract_accept', { contractId }),
  contractBrowse: (typeFilter) => sendMessage('contract_browse', { typeFilter }),
  contractGetMine: () => sendMessage('contract_get_mine'),
  contractBid: (contractId, amount) => sendMessage('contract_bid', { contractId, amount }),
  contractCancel: (contractId) => sendMessage('contract_cancel', { contractId }),

  // Sovereignty
  setSovereigntyInfo: (info) => set({ sovereigntyInfo: info }),
  setSovStructures: (structures) => set({ sovStructures: structures }),
  sovDeployStructure: (structureType) => sendMessage('sov_deploy_structure', { structureType }),
  sovGetInfo: () => sendMessage('sov_get_info'),

  reset: () => set({
    ...initialState,
    ships: new Map(),
    asteroids: new Map(),
    stations: new Map(),
    cargo: [],
    notifications: [],
    route: [],
    routeDestination: '',
    clones: [],
    activeImplants: [],
    implantSetBonuses: [],
    corpData: null,
    corpMembers: [],
    corpApplications: [],
    corpWalletBalances: [],
    corpWalletJournal: [],
    blueprints: [],
    industryJobs: [],
    colonies: [],
    selectedColony: null,
    colonyBuildings: [],
    colonyRoutes: [],
    scanResults: [],
    scanProbeCount: 0,
    browseContracts: [],
    myContracts: [],
    sovereigntyInfo: null,
    sovStructures: [],
  }),
}))
