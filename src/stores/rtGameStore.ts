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

export interface LockedTarget {
  id: string
  name: string
  type: string
  shieldPercent: number
  armorPercent: number
  hullPercent: number
  distance: number
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

  // Entity sync
  setShip: (id, data) => set((state) => {
    const newShips = new Map(state.ships)
    newShips.set(id, data)
    return { ships: newShips }
  }),

  removeShip: (id) => set((state) => {
    const newShips = new Map(state.ships)
    newShips.delete(id)
    return { ships: newShips }
  }),

  setAsteroid: (id, data) => set((state) => {
    const newAsteroids = new Map(state.asteroids)
    newAsteroids.set(id, data)
    return { asteroids: newAsteroids }
  }),

  removeAsteroid: (id) => set((state) => {
    const newAsteroids = new Map(state.asteroids)
    newAsteroids.delete(id)
    return { asteroids: newAsteroids }
  }),

  setStation: (id, data) => set((state) => {
    const newStations = new Map(state.stations)
    newStations.set(id, data)
    return { stations: newStations }
  }),

  removeStation: (id) => set((state) => {
    const newStations = new Map(state.stations)
    newStations.delete(id)
    return { stations: newStations }
  }),

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

  reset: () => set({
    ...initialState,
    ships: new Map(),
    asteroids: new Map(),
    stations: new Map(),
  }),
}))
