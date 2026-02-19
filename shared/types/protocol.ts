/**
 * Client ↔ Server Message Protocol
 *
 * Defines all message types exchanged between Colyseus client and server.
 */

// ============================================================================
// CLIENT → SERVER MESSAGES
// ============================================================================

export interface NavigateMessage {
  type: 'navigate'
  x: number
  y: number
  z: number
}

export interface WarpMessage {
  type: 'warp'
  targetSystemId?: string
  targetEntityId?: string
  x?: number
  y?: number
  z?: number
}

export interface OrbitMessage {
  type: 'orbit'
  targetId: string
  range: number // km
}

export interface ApproachMessage {
  type: 'approach'
  targetId: string
}

export interface AttackMessage {
  type: 'attack'
  targetId: string
  moduleSlot?: number // Which weapon module to use, -1 for all
}

export interface StopAttackMessage {
  type: 'stop_attack'
  targetId?: string // Specific target, or all if omitted
}

export interface MineMessage {
  type: 'mine'
  asteroidId: string
}

export interface StopMineMessage {
  type: 'stop_mine'
}

export interface DockMessage {
  type: 'dock'
  stationId: string
}

export interface UndockMessage {
  type: 'undock'
}

export interface ChatMessage {
  type: 'chat'
  channel: ChatChannel
  content: string
  targetUserId?: string // For private messages
}

export interface AlignMessage {
  type: 'align'
  targetId?: string
  x?: number
  y?: number
  z?: number
}

export interface StopMessage {
  type: 'stop'
}

export interface ActivateModuleMessage {
  type: 'activate_module'
  slot: number
  targetId?: string
}

export interface DeactivateModuleMessage {
  type: 'deactivate_module'
  slot: number
}

export interface FleetCommandMessage {
  type: 'fleet_command'
  command: FleetCommand
  targetId?: string
  formationType?: string
}

// ============================================================================
// SERVER → CLIENT MESSAGES
// ============================================================================

export interface SystemChatMessage {
  type: 'system_chat'
  channel: ChatChannel
  senderId: string
  senderName: string
  content: string
  timestamp: number
}

export interface DamageNotification {
  type: 'damage'
  attackerId: string
  targetId: string
  shieldDamage: number
  armorDamage: number
  hullDamage: number
  damageType: string // 'ballistic' | 'ionic' | 'explosive'
  isCritical: boolean
}

export interface ShipDestroyedNotification {
  type: 'ship_destroyed'
  shipId: string
  killerId: string
  position: { x: number; y: number; z: number }
}

export interface WarpStartNotification {
  type: 'warp_start'
  shipId: string
  destinationSystemId?: string
  destinationPosition?: { x: number; y: number; z: number }
}

export interface WarpEndNotification {
  type: 'warp_end'
  shipId: string
}

export interface MiningYieldNotification {
  type: 'mining_yield'
  asteroidId: string
  oreType: string
  amount: number
}

export interface DockingNotification {
  type: 'docking'
  shipId: string
  stationId: string
  action: 'docked' | 'undocked'
}

export interface ServerErrorMessage {
  type: 'server_error'
  code: string
  message: string
}

// ============================================================================
// TYPES & ENUMS
// ============================================================================

export type ChatChannel = 'local' | 'corp' | 'alliance' | 'private' | 'system'

export type FleetCommand =
  | 'warp_to'
  | 'align_to'
  | 'engage'
  | 'hold_position'
  | 'scatter'
  | 'regroup'
  | 'set_formation'

export type ShipState =
  | 'idle'
  | 'aligning'
  | 'warping'
  | 'approaching'
  | 'orbiting'
  | 'mining'
  | 'attacking'
  | 'docked'
  | 'destroyed'
  | 'warping_out' // Cross-system warp exit
  | 'warping_in'  // Cross-system warp entry

export type EntityType = 'ship' | 'asteroid' | 'station' | 'wreck' | 'container'

// ============================================================================
// UNION TYPES
// ============================================================================

// ============================================================================
// CROSS-SYSTEM WARP MESSAGES
// ============================================================================

export interface WarpCrossSystemMessage {
  type: 'warp_cross_system'
  targetSystemId: string
}

export interface SystemTransferNotification {
  type: 'system_transfer'
  targetSystemId: string
  targetSystemName: string
}

// ============================================================================
// UNION TYPES
// ============================================================================

export type ClientMessage =
  | NavigateMessage
  | WarpMessage
  | OrbitMessage
  | ApproachMessage
  | AttackMessage
  | StopAttackMessage
  | MineMessage
  | StopMineMessage
  | DockMessage
  | UndockMessage
  | ChatMessage
  | AlignMessage
  | StopMessage
  | ActivateModuleMessage
  | DeactivateModuleMessage
  | FleetCommandMessage
  | WarpCrossSystemMessage

export type ServerMessage =
  | SystemChatMessage
  | DamageNotification
  | ShipDestroyedNotification
  | WarpStartNotification
  | WarpEndNotification
  | MiningYieldNotification
  | DockingNotification
  | ServerErrorMessage
  | SystemTransferNotification
