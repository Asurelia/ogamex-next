/**
 * RecycleMission Handler
 *
 * Handles recycling missions that collect debris from debris fields.
 * - On arrival: collects metal and crystal from debris field
 * - On return: delivers collected resources to origin planet
 *
 * Only recycler ships can participate in this mission.
 * Each recycler has a capacity of 20,000 units.
 */

import type { MissionType } from '@/types/database'
import { BaseMission } from '../BaseMission'
import {
  MissionContext,
  MissionArrivalResult,
  MissionReturnResult,
  Resources,
  ShipCounts,
  emptyResources,
} from '../types'
import {
  DebrisField,
  DebrisCollectionResult,
  RECYCLER_CAPACITY,
  calculateRecycleCapacity,
} from '@/lib/debris/types'

export class RecycleMission extends BaseMission {
  readonly missionType: MissionType = 'recycle'
  readonly hasReturn: boolean = true
  readonly name: string = 'Recycle'

  /**
   * Process recycle mission arrival at debris field
   *
   * 1. Fetch debris field at target coordinates
   * 2. Calculate recycling capacity
   * 3. Collect resources (proportional if capacity < debris)
   * 4. Update debris field in database
   * 5. Create return mission with collected resources
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission } = context

    const ships = this.getShips(mission)
    const recyclerCount = ships.recycler

    // Validate mission has recyclers
    if (recyclerCount <= 0) {
      return this.errorArrival('No recyclers in fleet')
    }

    // Fetch debris field at target coordinates
    const debrisField = await this.fetchDebrisField(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    // Format coordinates for messages
    const targetCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    // If no debris field exists or is empty
    if (!debrisField || (debrisField.metal === 0 && debrisField.crystal === 0)) {
      const message = this.createMessage(
        mission.user_id,
        'transport',
        'Recycling - No Debris',
        `Your recycling fleet arrived at ${targetCoords} but found no debris to collect.\n` +
          `The fleet is returning empty-handed.`
      )

      return this.successArrival(
        true,
        emptyResources(),
        ships,
        [message],
        []
      )
    }

    // Calculate capacity and collect debris
    const capacity = calculateRecycleCapacity(recyclerCount)
    const collection = this.harvestDebris(debrisField, capacity)

    // Update or delete debris field
    await this.updateDebrisField(debrisField.id, collection)

    // Create collected resources
    const collectedResources: Resources = {
      metal: collection.metalCollected,
      crystal: collection.crystalCollected,
      deuterium: 0,
    }

    // Create success message
    const message = this.createMessage(
      mission.user_id,
      'transport',
      'Recycling Successful',
      `Your recycling fleet at ${targetCoords} has collected:\n` +
        `Metal: ${collection.metalCollected.toLocaleString()}\n` +
        `Crystal: ${collection.crystalCollected.toLocaleString()}\n\n` +
        (collection.fieldDepleted
          ? 'The debris field has been completely cleared.'
          : `Remaining in debris field:\n` +
            `Metal: ${collection.metalRemaining.toLocaleString()}\n` +
            `Crystal: ${collection.crystalRemaining.toLocaleString()}`) +
        `\n\nThe fleet is now returning with the resources.`
    )

    return this.successArrival(
      true,
      collectedResources,
      ships,
      [message],
      []
    )
  }

  /**
   * Process recycle mission return
   *
   * 1. Add collected resources to origin planet
   * 2. Add ships back to origin planet
   * 3. Send return message to player
   */
  async processReturn(context: MissionContext): Promise<MissionReturnResult> {
    const { mission, originPlanet } = context

    if (!originPlanet) {
      return this.errorReturn('Origin planet not found')
    }

    const ships = this.getShips(mission)
    const resources = this.getResources(mission)

    // Add ships back to origin planet
    const addShipsResult = await this.addShipsToPlanet(originPlanet.id, ships)
    if (!addShipsResult.success) {
      return this.errorReturn(`Failed to return ships: ${addShipsResult.error}`)
    }

    // Add collected resources to origin planet
    if (resources.metal > 0 || resources.crystal > 0 || resources.deuterium > 0) {
      const addResourcesResult = await this.addResourcesToPlanet(originPlanet.id, resources)
      if (!addResourcesResult.success) {
        return this.errorReturn(`Failed to deliver resources: ${addResourcesResult.error}`)
      }
    }

    // Format coordinates
    const originCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )
    const returnFromCoords = this.formatCoords(
      mission.origin_galaxy,
      mission.origin_system,
      mission.origin_position
    )

    // Create return message
    const message = this.createMessage(
      mission.user_id,
      'transport',
      'Recyclers Returned',
      `Your recycling fleet has returned from ${returnFromCoords} to ${originCoords}.\n\n` +
        `Resources delivered:\n` +
        `Metal: ${resources.metal.toLocaleString()}\n` +
        `Crystal: ${resources.crystal.toLocaleString()}\n` +
        `Deuterium: ${resources.deuterium.toLocaleString()}`
    )

    return this.successReturn([message], [])
  }

  /**
   * Calculate total recycling capacity for the fleet
   */
  private calculateRecycleCapacity(ships: ShipCounts): number {
    return ships.recycler * RECYCLER_CAPACITY
  }

  /**
   * Harvest debris from a debris field based on recycler capacity
   * If capacity is less than total debris, collects proportionally (50/50 split)
   */
  private harvestDebris(debrisField: DebrisField, capacity: number): DebrisCollectionResult {
    const totalDebris = debrisField.metal + debrisField.crystal

    // If we can collect everything
    if (capacity >= totalDebris) {
      return {
        metalCollected: debrisField.metal,
        crystalCollected: debrisField.crystal,
        metalRemaining: 0,
        crystalRemaining: 0,
        fieldDepleted: true,
      }
    }

    // Calculate proportional collection
    // Use the ratio of each resource type in the debris field
    const metalRatio = totalDebris > 0 ? debrisField.metal / totalDebris : 0.5
    const crystalRatio = totalDebris > 0 ? debrisField.crystal / totalDebris : 0.5

    // Collect proportionally to what exists
    const metalToCollect = Math.floor(capacity * metalRatio)
    const crystalToCollect = Math.floor(capacity * crystalRatio)

    // Ensure we don't collect more than exists
    const metalCollected = Math.min(metalToCollect, debrisField.metal)
    const crystalCollected = Math.min(crystalToCollect, debrisField.crystal)

    return {
      metalCollected,
      crystalCollected,
      metalRemaining: debrisField.metal - metalCollected,
      crystalRemaining: debrisField.crystal - crystalCollected,
      fieldDepleted: false,
    }
  }

  /**
   * Fetch debris field at coordinates
   */
  private async fetchDebrisField(
    galaxy: number,
    system: number,
    position: number
  ): Promise<DebrisField | null> {
    const { data } = await this.supabase
      .from('debris_fields')
      .select('*')
      .eq('galaxy', galaxy)
      .eq('system', system)
      .eq('position', position)
      .single()

    return data as DebrisField | null
  }

  /**
   * Update debris field after collection
   * Deletes the field if depleted, otherwise updates remaining amounts
   */
  private async updateDebrisField(
    debrisId: string,
    collection: DebrisCollectionResult
  ): Promise<void> {
    if (collection.fieldDepleted) {
      // Delete the debris field if empty
      await this.supabase
        .from('debris_fields')
        .delete()
        .eq('id', debrisId)
    } else {
      // Update remaining debris
      await this.supabase
        .from('debris_fields')
        .update({
          metal: collection.metalRemaining,
          crystal: collection.crystalRemaining,
          updated_at: new Date().toISOString(),
        })
        .eq('id', debrisId)
    }
  }
}
