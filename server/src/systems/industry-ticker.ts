/**
 * Industry Ticker
 *
 * Runs every 60 seconds. Checks for completed industry jobs
 * (manufacturing, invention, copying, research).
 * All persistence via SQLite (persistence.ts).
 */

import {
  getPendingIndustryJobs, completeIndustryJob,
  getBlueprint, updateBlueprintRuns, updateBlueprintME, updateBlueprintTE,
  createBlueprint, addItem, createIndustryJob,
} from '../services/persistence'
import { calculateInventionProbability, createInventedBlueprint, getBlueprintDefinition } from '../../../src/data/blueprint-definitions'

// ============================================================================
// MAIN TICK
// ============================================================================

export function tickIndustry(): void {
  const nowTs = Math.floor(Date.now() / 1000)
  const completedJobs = getPendingIndustryJobs(nowTs)

  if (completedJobs.length === 0) return

  for (const job of completedJobs) {
    try {
      processCompletedJob(job)
    } catch (err) {
      console.error(`[IndustryTicker] Failed to process job ${job.id}:`, err)
    }
  }
}

function processCompletedJob(job: Record<string, unknown>): void {
  switch (job.activity) {
    case 'manufacturing': {
      if (job.output_item_type_id) {
        addItem(
          job.owner_id as string,
          'character',
          'station_hangar',
          job.station_id as string,
          job.output_item_type_id as string,
          job.output_quantity as number
        )
      }

      // Consume BPC runs if applicable
      const blueprint = getBlueprint(job.blueprint_id as string, job.owner_id as string)
      if (blueprint && !blueprint.is_original && (blueprint.runs_remaining as number) > 0) {
        updateBlueprintRuns(job.blueprint_id as string, (blueprint.runs_remaining as number) - 1)
      }

      completeIndustryJob(job.id as string, 'success')
      break
    }

    case 'invention': {
      const probability = job.success_probability as number
      const success = Math.random() < probability

      if (success) {
        const bpDef = getBlueprintDefinition(job.output_item_type_id as string)
        if (bpDef) {
          const invented = createInventedBlueprint(bpDef)
          createBlueprint(
            job.owner_id as string,
            bpDef.outputItemTypeId,
            false, invented.runs,
            invented.meModifier, invented.teModifier,
            2, 'station_hangar', job.station_id as string
          )
        }
      }

      completeIndustryJob(job.id as string, success ? 'success' : 'failure')
      break
    }

    case 'copying': {
      const sourceBP = getBlueprint(job.blueprint_id as string, job.owner_id as string)
      if (sourceBP) {
        createBlueprint(
          job.owner_id as string,
          sourceBP.item_type_id as string,
          false, (job.output_quantity as number) || 10,
          sourceBP.material_efficiency as number,
          sourceBP.time_efficiency as number,
          sourceBP.tech_level as number,
          'station_hangar', job.station_id as string
        )
      }

      completeIndustryJob(job.id as string, 'success')
      break
    }

    case 'research_me': {
      const bp = getBlueprint(job.blueprint_id as string, job.owner_id as string)
      if (bp) {
        const newME = Math.min(10, (bp.material_efficiency as number) + 1)
        updateBlueprintME(job.blueprint_id as string, newME)
      }
      completeIndustryJob(job.id as string, 'success')
      break
    }

    case 'research_te': {
      const bp = getBlueprint(job.blueprint_id as string, job.owner_id as string)
      if (bp) {
        const newTE = Math.min(20, (bp.time_efficiency as number) + 2)
        updateBlueprintTE(job.blueprint_id as string, newTE)
      }
      completeIndustryJob(job.id as string, 'success')
      break
    }
  }
}

// ============================================================================
// INDUSTRY HANDLERS
// ============================================================================

export function startIndustryJob(
  ownerId: string,
  stationId: string,
  blueprintId: string,
  activity: string,
  durationOverride?: number
): { success: boolean; error?: string; jobId?: string } {
  const blueprint = getBlueprint(blueprintId, ownerId)
  if (!blueprint) return { success: false, error: 'Blueprint not found' }

  const bpDef = getBlueprintDefinition(blueprint.item_type_id as string)
  if (!bpDef) return { success: false, error: 'Unknown blueprint type' }

  let duration = durationOverride ?? bpDef.baseManufacturingTime
  if (activity === 'copying') duration = bpDef.baseCopyTime
  if (activity === 'research_me') duration = bpDef.baseResearchMETime
  if (activity === 'research_te') duration = bpDef.baseResearchTETime

  // Apply TE bonus
  const teReduction = 1 - ((blueprint.time_efficiency as number) * 0.01)
  duration = Math.ceil(duration * teReduction)

  const nowTs = Math.floor(Date.now() / 1000)
  const endsAt = nowTs + duration

  let successProbability = 1.0
  if (activity === 'invention') {
    successProbability = calculateInventionProbability()
  }

  const jobId = createIndustryJob(
    ownerId, stationId, blueprintId, activity,
    bpDef.outputItemTypeId, bpDef.outputQuantity,
    duration, nowTs, endsAt, successProbability
  )

  return { success: true, jobId }
}
