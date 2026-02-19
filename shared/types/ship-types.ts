/**
 * Ship Type Definitions - Shared between client and server
 *
 * Reuses damage/resistance interfaces from the battle system.
 */

import type { DamageTypes, ResistanceTypes } from '../../src/lib/battle/damage-types'

// ============================================================================
// FACTIONS
// ============================================================================

export type Faction = 'amarr' | 'caldari' | 'gallente' | 'minmatar' | 'pirate' | 'npc'

// ============================================================================
// SHIP CLASSES
// ============================================================================

export type ShipClass =
  | 'frigate'
  | 'destroyer'
  | 'cruiser'
  | 'battlecruiser'
  | 'battleship'
  | 'industrial'
  | 'mining_barge'
  | 'shuttle'
  | 'capsule'

// ============================================================================
// SLOT TYPES
// ============================================================================

export interface SlotLayout {
  high: number
  mid: number
  low: number
  rig: number
}

// ============================================================================
// SHIP TYPE DEFINITION (static reference data)
// ============================================================================

export interface ShipTypeDefinition {
  id: string
  name: string
  faction: Faction
  shipClass: ShipClass
  description: string

  // Base stats
  baseHp: number
  baseShield: number
  baseArmor: number

  // Movement
  maxVelocity: number      // m/s
  alignTime: number         // seconds to align
  warpSpeed: number         // AU/s
  inertiaModifier: number

  // Capacitor
  capacitor: number         // GJ
  capacitorRechargeTime: number // seconds

  // Fitting
  slots: SlotLayout
  cpu: number               // tf
  powergrid: number         // MW

  // Cargo
  cargoCapacity: number     // m3
  droneCapacity: number     // m3
  droneBandwidth: number    // Mbit/s

  // Sensors
  sensorStrength: number
  signatureRadius: number   // m
  scanResolution: number    // mm
  targetRange: number       // km
  maxLockedTargets: number

  // Damage/Resistance profiles
  baseDamage: Partial<DamageTypes>
  baseResistances: Partial<ResistanceTypes>

  // Bonuses (per skill level)
  bonuses: ShipBonus[]

  // 3D rendering
  modelId: string
}

// ============================================================================
// SHIP BONUS
// ============================================================================

export interface ShipBonus {
  skillTypeId: number
  attribute: string
  bonusPerLevel: number
  description: string
}

// ============================================================================
// SHIP INSTANCE (in-game ship)
// ============================================================================

export interface ShipInstance {
  id: string
  ownerId: string
  shipTypeId: string
  systemId: string
  stationId: string | null

  // Position
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }

  // Current stats
  currentHp: number
  currentShield: number
  currentArmor: number
  currentCapacitor: number

  // Fitting
  fitting: FittedModule[]

  // Cargo
  cargo: CargoItem[]

  // State
  isActive: boolean
  isDocked: boolean
}

// ============================================================================
// MODULE / CARGO
// ============================================================================

export interface FittedModule {
  slotType: 'high' | 'mid' | 'low' | 'rig'
  slotIndex: number
  moduleTypeId: string
  isActive: boolean
  isOverloaded: boolean
}

export interface CargoItem {
  typeId: string
  name: string
  quantity: number
  volume: number // m3 per unit
}

// ============================================================================
// ORE TYPES
// ============================================================================

export type OreType =
  | 'veldspar'
  | 'scordite'
  | 'pyroxeres'
  | 'plagioclase'
  | 'omber'
  | 'kernite'
  | 'jaspet'
  | 'hemorphite'
  | 'hedbergite'
  | 'dark_ochre'
  | 'gneiss'
  | 'spodumain'
  | 'crokite'
  | 'bistot'
  | 'arkonor'
  | 'mercoxit'

export const ORE_COLORS: Record<OreType, string> = {
  veldspar: '#c8b464',
  scordite: '#8b7355',
  pyroxeres: '#cd853f',
  plagioclase: '#e8e8e8',
  omber: '#daa520',
  kernite: '#b8860b',
  jaspet: '#8b0000',
  hemorphite: '#4169e1',
  hedbergite: '#2f4f4f',
  dark_ochre: '#654321',
  gneiss: '#808080',
  spodumain: '#d2691e',
  crokite: '#b22222',
  bistot: '#006400',
  arkonor: '#9400d3',
  mercoxit: '#ff4500',
}

export const ORE_VALUES: Record<OreType, number> = {
  veldspar: 10,
  scordite: 15,
  pyroxeres: 22,
  plagioclase: 30,
  omber: 45,
  kernite: 60,
  jaspet: 80,
  hemorphite: 100,
  hedbergite: 120,
  dark_ochre: 150,
  gneiss: 180,
  spodumain: 200,
  crokite: 250,
  bistot: 300,
  arkonor: 350,
  mercoxit: 500,
}

export const ORE_VOLUME: Record<OreType, number> = {
  veldspar: 0.1,
  scordite: 0.15,
  pyroxeres: 0.3,
  plagioclase: 0.35,
  omber: 0.6,
  kernite: 1.2,
  jaspet: 2.0,
  hemorphite: 3.0,
  hedbergite: 3.0,
  dark_ochre: 8.0,
  gneiss: 5.0,
  spodumain: 16.0,
  crokite: 16.0,
  bistot: 16.0,
  arkonor: 16.0,
  mercoxit: 40.0,
}
