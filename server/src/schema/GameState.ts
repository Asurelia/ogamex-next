/**
 * Colyseus State Schema
 *
 * Authoritative game state synchronized to clients.
 * Uses @colyseus/schema for efficient binary serialization.
 */

import { Schema, MapSchema, type, filter } from '@colyseus/schema'

// ============================================================================
// SHIP STATE
// ============================================================================

export class ShipState extends Schema {
  @type('string') id: string = ''
  @type('string') ownerId: string = ''
  @type('string') ownerName: string = ''
  @type('string') shipTypeId: string = ''

  // Position (float32 precision is sufficient for game space)
  @type('float32') x: number = 0
  @type('float32') y: number = 0
  @type('float32') z: number = 0

  // Velocity
  @type('float32') vx: number = 0
  @type('float32') vy: number = 0
  @type('float32') vz: number = 0

  // Rotation (euler angles)
  @type('float32') rx: number = 0
  @type('float32') ry: number = 0
  @type('float32') rz: number = 0

  // Speed scalar
  @type('float32') speed: number = 0
  @type('float32') maxSpeed: number = 300

  // State enum as uint8
  @type('uint8') state: number = ShipStateEnum.IDLE

  // Target
  @type('string') targetId: string = ''

  // Defense layers
  @type('int32') hp: number = 500
  @type('int32') hpMax: number = 500
  @type('int32') shield: number = 500
  @type('int32') shieldMax: number = 500
  @type('int32') armor: number = 500
  @type('int32') armorMax: number = 500

  // Capacitor
  @type('int32') capacitor: number = 250
  @type('int32') capacitorMax: number = 250

  // Flags
  @type('boolean') isDocked: boolean = false
  @type('boolean') isNpc: boolean = false

  // Faction for UI coloring
  @type('string') faction: string = 'caldari'
}

export enum ShipStateEnum {
  IDLE = 0,
  ALIGNING = 1,
  WARPING = 2,
  APPROACHING = 3,
  ORBITING = 4,
  MINING = 5,
  ATTACKING = 6,
  DOCKED = 7,
  DESTROYED = 8,
  WARPING_OUT = 9,
  WARPING_IN = 10,
}

// ============================================================================
// ASTEROID STATE
// ============================================================================

export class AsteroidState extends Schema {
  @type('string') id: string = ''

  @type('float32') x: number = 0
  @type('float32') y: number = 0
  @type('float32') z: number = 0

  @type('string') oreType: string = 'veldspar'
  @type('float32') volume: number = 1000 // m3 remaining
  @type('float32') maxVolume: number = 1000
  @type('float32') radius: number = 50 // visual radius
}

// ============================================================================
// STATION STATE
// ============================================================================

export class StationState extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('string') stationType: string = 'trade_hub'

  @type('float32') x: number = 0
  @type('float32') y: number = 0
  @type('float32') z: number = 0
}

// ============================================================================
// SYSTEM STATE (Root State)
// ============================================================================

export class SystemState extends Schema {
  @type('string') systemId: string = ''
  @type('string') systemName: string = ''
  @type('float32') securityLevel: number = 1.0
  @type('string') starType: string = 'G'

  @type({ map: ShipState }) ships = new MapSchema<ShipState>()
  @type({ map: AsteroidState }) asteroids = new MapSchema<AsteroidState>()
  @type({ map: StationState }) stations = new MapSchema<StationState>()

  // Server tick counter for client sync
  @type('uint32') tick: number = 0
}
