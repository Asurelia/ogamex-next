/**
 * Sovereignty Ticker
 *
 * Runs every 5 minutes. Updates ADM indices, checks reinforcement timers,
 * manages sovereignty structures. All persistence via SQLite.
 */

import {
  getAllSovereignty, updateSovIndices, getSov, upsertSov, deleteSov,
  getReinforcedStructures, getAnchoringStructures, updateSovStructState,
  getSovStructure, updateSovStructHp, updateSovStructReinforce,
} from '../services/persistence'

const ADM_DECAY_RATE = 0.01
const ADM_GAIN_MILITARY = 0.005
const ADM_GAIN_INDUSTRIAL = 0.003
const ADM_GAIN_STRATEGIC = 0.002

export function tickSovereignty(): void {
  const nowTs = Math.floor(Date.now() / 1000)

  // 1. Decay ADM indices
  const sovEntries = getAllSovereignty()
  for (const sov of sovEntries) {
    const newMil = Math.max(0, (sov.military_index as number) - ADM_DECAY_RATE)
    const newInd = Math.max(0, (sov.industrial_index as number) - ADM_DECAY_RATE)
    const newStrat = Math.max(0, (sov.strategic_index as number) - ADM_DECAY_RATE)
    updateSovIndices(
      sov.system_id as string,
      Number(newMil.toFixed(3)),
      Number(newInd.toFixed(3)),
      Number(newStrat.toFixed(3))
    )
  }

  // 2. Check reinforcement timers on structures
  const reinforced = getReinforcedStructures(nowTs)
  for (const structure of reinforced) {
    updateSovStructState(structure.id as string, 'online', null)
  }

  // 3. Check anchoring structures (2 hour anchor time)
  const twoHoursAgoTs = nowTs - 7200
  const anchoring = getAnchoringStructures(twoHoursAgoTs)
  for (const structure of anchoring) {
    updateSovStructState(structure.id as string, 'online', null)

    // If TCU comes online, claim sovereignty
    if (structure.structure_type === 'tcu') {
      upsertSov(structure.system_id as string, structure.owner_corp_id as string, 1)
    }
  }
}

/**
 * Increment ADM for a system based on activity.
 */
export function incrementADM(
  systemId: string,
  activityType: 'military' | 'industrial' | 'strategic',
  amount?: number
): void {
  const gain = amount ?? (
    activityType === 'military' ? ADM_GAIN_MILITARY :
    activityType === 'industrial' ? ADM_GAIN_INDUSTRIAL :
    ADM_GAIN_STRATEGIC
  )

  const sov = getSov(systemId)
  if (!sov) return

  const colKey = `${activityType}_index` as string
  const currentValue = (sov[colKey] as number) ?? 0
  const newValue = Math.min(5, currentValue + gain)

  // We need to update the specific index
  const mil = activityType === 'military' ? Number(newValue.toFixed(3)) : (sov.military_index as number)
  const ind = activityType === 'industrial' ? Number(newValue.toFixed(3)) : (sov.industrial_index as number)
  const strat = activityType === 'strategic' ? Number(newValue.toFixed(3)) : (sov.strategic_index as number)
  updateSovIndices(systemId, mil, ind, strat)
}

/**
 * Apply damage to a sovereignty structure.
 */
export function damageSovStructure(
  structureId: string,
  damage: number
): { destroyed: boolean; reinforced: boolean } {
  const structure = getSovStructure(structureId)
  if (!structure || structure.state === 'destroyed' || structure.state === 'anchoring') {
    return { destroyed: false, reinforced: false }
  }

  // Check vulnerability window
  const now = new Date()
  const hour = now.getUTCHours()
  const vulnStart = structure.vulnerability_start_hour as number
  const vulnEnd = (vulnStart + (structure.vulnerability_duration_hours as number)) % 24

  const isVulnerable = vulnStart < vulnEnd
    ? (hour >= vulnStart && hour < vulnEnd)
    : (hour >= vulnStart || hour < vulnEnd)

  if (!isVulnerable && structure.state === 'online') {
    return { destroyed: false, reinforced: false }
  }

  const newHp = (structure.hp as number) - damage

  if (newHp <= 0) {
    updateSovStructState(structureId, 'destroyed', null)
    updateSovStructHp(structureId, 0)

    if (structure.structure_type === 'tcu') {
      deleteSov(structure.system_id as string)
    }

    return { destroyed: true, reinforced: false }
  }

  // Enter reinforcement at 25% HP
  if (newHp <= (structure.hp_max as number) * 0.25 && structure.state !== 'reinforced') {
    const reinforcedUntil = Math.floor(Date.now() / 1000) + 24 * 3600
    updateSovStructReinforce(structureId, newHp, reinforcedUntil)
    return { destroyed: false, reinforced: true }
  }

  updateSovStructHp(structureId, newHp)
  return { destroyed: false, reinforced: false }
}
