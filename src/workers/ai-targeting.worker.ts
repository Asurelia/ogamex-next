/**
 * AI Targeting / Threat Assessment WebWorker
 *
 * Offloads threat level estimation to a background thread.
 * The Overview panel uses threat scores for the threat column
 * and for sorting visible ships by danger level.
 *
 * Messages:
 *   IN:  ThreatAssessmentRequest  { type: 'assess_threats', ships, myShipId }
 *   OUT: ThreatAssessmentResponse { type: 'threat_scores', scores }
 */

// ============================================================================
// MESSAGE TYPES
// ============================================================================

interface ShipData {
  id: string
  shipTypeId: string
  state: number // ShipStateEnum value
  hp: number
  hpMax: number
  shield: number
  shieldMax: number
  armor: number
  armorMax: number
  speed: number
  maxSpeed: number
  distance: number // Distance from the player's ship in meters
  isNpc: boolean
  faction: string
}

interface ThreatAssessmentRequest {
  type: 'assess_threats'
  ships: ShipData[]
  myShipId: string
}

interface ThreatScore {
  shipId: string
  score: number    // 0-100 threat level
  category: 'critical' | 'high' | 'medium' | 'low' | 'none'
}

interface ThreatAssessmentResponse {
  type: 'threat_scores'
  scores: ThreatScore[]
}

// ============================================================================
// SHIP STATE ENUM (duplicated to avoid import in worker)
// ============================================================================

const ShipStateEnum = {
  IDLE: 0,
  ALIGNING: 1,
  WARPING: 2,
  APPROACHING: 3,
  ORBITING: 4,
  MINING: 5,
  ATTACKING: 6,
  DOCKED: 7,
  DESTROYED: 8,
  WARPING_OUT: 9,
  WARPING_IN: 10,
} as const

// ============================================================================
// SHIP CLASS THREAT WEIGHTS
// ============================================================================

/**
 * Base threat value by ship class extracted from shipTypeId.
 * Higher = more dangerous.
 */
const CLASS_THREAT: Record<string, number> = {
  capsule: 0,
  shuttle: 2,
  industrial: 5,
  mining_barge: 5,
  frigate: 15,
  destroyer: 25,
  cruiser: 40,
  battlecruiser: 55,
  battleship: 70,
  carrier: 85,
  dreadnought: 90,
  titan: 100,
}

/**
 * State-based threat multiplier.
 * Ships that are actively attacking are far more threatening.
 */
const STATE_MULTIPLIER: Record<number, number> = {
  [ShipStateEnum.ATTACKING]: 2.0,
  [ShipStateEnum.APPROACHING]: 1.3,
  [ShipStateEnum.ORBITING]: 1.2,
  [ShipStateEnum.ALIGNING]: 0.8,
  [ShipStateEnum.IDLE]: 0.6,
  [ShipStateEnum.MINING]: 0.3,
  [ShipStateEnum.WARPING]: 0.1,
  [ShipStateEnum.WARPING_OUT]: 0.05,
  [ShipStateEnum.WARPING_IN]: 0.5,
  [ShipStateEnum.DOCKED]: 0.0,
  [ShipStateEnum.DESTROYED]: 0.0,
}

// ============================================================================
// THREAT ASSESSMENT
// ============================================================================

function assessThreats(ships: ShipData[], myShipId: string): ThreatScore[] {
  const scores: ThreatScore[] = []

  for (const ship of ships) {
    if (ship.id === myShipId) continue

    const score = calculateThreatScore(ship)
    scores.push({
      shipId: ship.id,
      score,
      category: categorizeScore(score),
    })
  }

  // Sort by threat score descending
  scores.sort((a, b) => b.score - a.score)

  return scores
}

function calculateThreatScore(ship: ShipData): number {
  // 1. Base class threat (0-100)
  const shipClass = extractShipClass(ship.shipTypeId)
  const classThreat = CLASS_THREAT[shipClass] ?? 20

  // 2. State multiplier
  const stateMult = STATE_MULTIPLIER[ship.state] ?? 0.5

  // 3. Distance factor: closer = more threatening
  // Ships within 10km are max threat, ships at 200km+ are minimal
  const distanceFactor = Math.max(0, 1 - ship.distance / 200000)

  // 4. Health factor: damaged ships are slightly less threatening
  const hpRatio = ship.hpMax > 0 ? ship.hp / ship.hpMax : 0
  const shieldRatio = ship.shieldMax > 0 ? ship.shield / ship.shieldMax : 0
  const healthFactor = 0.5 + 0.5 * ((hpRatio + shieldRatio) / 2)

  // 5. Speed factor: fast-moving ships approaching are more threatening
  const speedRatio = ship.maxSpeed > 0 ? ship.speed / ship.maxSpeed : 0
  const speedFactor = 0.7 + 0.3 * speedRatio

  // 6. Faction modifier: hostile factions are more threatening
  const factionMult = getFactionThreatMultiplier(ship.faction, ship.isNpc)

  // Combine factors
  let threat = classThreat * stateMult * distanceFactor * healthFactor * speedFactor * factionMult

  // Clamp to 0-100
  threat = Math.max(0, Math.min(100, threat))

  return Math.round(threat * 10) / 10
}

/**
 * Extract ship class from shipTypeId (e.g., 'caldari_battleship' -> 'battleship')
 */
function extractShipClass(shipTypeId: string): string {
  const parts = shipTypeId.split('_')
  return parts[parts.length - 1] || 'frigate'
}

/**
 * Get threat multiplier based on faction.
 * Pirate NPCs are inherently more threatening than neutral NPCs.
 */
function getFactionThreatMultiplier(faction: string, isNpc: boolean): number {
  if (faction === 'pirate') return 1.5
  if (isNpc && (faction === 'npc' || faction === '')) return 0.8
  // Player ships of any faction are baseline threat
  return 1.0
}

/**
 * Categorize a numeric score into a threat level string
 */
function categorizeScore(score: number): ThreatScore['category'] {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'medium'
  if (score > 5) return 'low'
  return 'none'
}

// ============================================================================
// WORKER MESSAGE HANDLER
// ============================================================================

self.onmessage = (event: MessageEvent<ThreatAssessmentRequest>) => {
  const { type, ships, myShipId } = event.data

  if (type !== 'assess_threats') return

  const scores = assessThreats(ships, myShipId)

  const response: ThreatAssessmentResponse = {
    type: 'threat_scores',
    scores,
  }

  self.postMessage(response)
}

// Export types for consumers
export type { ThreatAssessmentRequest, ThreatAssessmentResponse, ThreatScore, ShipData }
