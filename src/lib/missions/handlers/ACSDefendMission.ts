/**
 * ACSDefendMission Handler
 *
 * Handles ACS defense missions where fleets are sent to defend an ally's planet.
 * The defending fleet joins the planet's defense during any attack.
 *
 * Key Features:
 * - Fleet stays at the target planet for the hold time
 * - Participates in any battle during that time
 * - Returns home after hold time expires or after battle
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
  emptyShipCounts,
  SHIP_KEYS,
  hasResources,
} from '../types'

export class ACSDefendMission extends BaseMission {
  readonly missionType: MissionType = 'acs_defend'
  readonly hasReturn: boolean = true
  readonly name: string = 'ACS Defend'

  /**
   * Process ACS defend mission arrival
   *
   * When a fleet arrives to defend:
   * 1. Register the fleet as stationed at the target planet
   * 2. The fleet will be included in any battles at that location
   * 3. After hold time (or after battle), fleet returns home
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission, targetPlanet } = context

    // Target planet must exist
    if (!targetPlanet) {
      const ships = this.getShips(mission)
      const resources = this.getResources(mission)

      const message = this.createMessage(
        mission.user_id,
        'battle',
        'ACS Defense Mission Failed',
        `Your defense fleet arrived at ${this.formatCoords(
          mission.destination_galaxy,
          mission.destination_system,
          mission.destination_position
        )} but found no planet. The fleet is returning.`
      )

      return this.successArrival(true, resources, ships, [message], [])
    }

    // Cannot defend your own planets (use deployment instead)
    if (targetPlanet.user_id === mission.user_id) {
      const ships = this.getShips(mission)
      const resources = this.getResources(mission)

      const message = this.createMessage(
        mission.user_id,
        'battle',
        'ACS Defense Error',
        'You cannot send an ACS defense to your own planet. Use deployment instead.'
      )

      return this.successArrival(true, resources, ships, [message], [])
    }

    // Check if there's an ACS operation this fleet belongs to
    const { data: participant } = await this.supabase
      .from('acs_participants')
      .select('*, acs_operations(*)')
      .eq('fleet_mission_id', mission.id)
      .single()

    const ships = this.getShips(mission)
    const resources = this.getResources(mission)

    if (participant) {
      // Part of an ACS operation
      await this.supabase
        .from('acs_participants')
        .update({
          status: 'arrived',
          arrival_time: new Date().toISOString(),
        })
        .eq('id', participant.id)

      const holdTime = participant.acs_operations?.hold_time || 30

      // Create notification for defender
      const defenderMessage = this.createMessage(
        targetPlanet.user_id,
        'battle',
        'Allied Fleet Arrived',
        `An allied fleet has arrived to defend your planet at ${this.formatCoords(
          mission.destination_galaxy,
          mission.destination_system,
          mission.destination_position
        )}.\n\nFleet will stay for ${holdTime} seconds.`
      )

      // Create notification for the fleet owner
      const ownerMessage = this.createMessage(
        mission.user_id,
        'battle',
        'Defense Fleet Stationed',
        `Your fleet has arrived at ${this.formatCoords(
          mission.destination_galaxy,
          mission.destination_system,
          mission.destination_position
        )} and is now defending the planet.\n\nFleet will return after ${holdTime} seconds.`
      )

      // The fleet doesn't return immediately - it waits
      // The mission processor will handle the return after hold time
      // For now, we mark it as not returning to keep it stationed
      return this.successArrival(false, resources, ships, [defenderMessage, ownerMessage], [])
    }

    // Standalone defense (not part of ACS operation)
    // Fleet stations at the planet temporarily

    const defenderMessage = this.createMessage(
      targetPlanet.user_id,
      'battle',
      'Allied Fleet Arrived',
      `An allied fleet has arrived to defend your planet at ${this.formatCoords(
        mission.destination_galaxy,
        mission.destination_system,
        mission.destination_position
      )}.`
    )

    const ownerMessage = this.createMessage(
      mission.user_id,
      'battle',
      'Defense Fleet Stationed',
      `Your fleet has arrived at ${this.formatCoords(
        mission.destination_galaxy,
        mission.destination_system,
        mission.destination_position
      )} and is now defending the planet.`
    )

    // After arrival, fleet will eventually return
    // This is handled by hold time logic
    return this.successArrival(true, resources, ships, [defenderMessage, ownerMessage], [])
  }

  /**
   * Process ACS defend mission return
   */
  async processReturn(context: MissionContext): Promise<MissionReturnResult> {
    const { mission, originPlanet } = context

    if (!originPlanet) {
      return this.errorReturn('Origin planet not found')
    }

    const ships = this.getShips(mission)
    const resources = this.getResources(mission)

    // Add ships back to origin
    const addShipsResult = await this.addShipsToPlanet(originPlanet.id, ships)
    if (!addShipsResult.success) {
      return this.errorReturn(`Failed to return ships: ${addShipsResult.error}`)
    }

    // Add resources
    if (hasResources(resources)) {
      const addResourcesResult = await this.addResourcesToPlanet(originPlanet.id, resources)
      if (!addResourcesResult.success) {
        return this.errorReturn(`Failed to return resources: ${addResourcesResult.error}`)
      }
    }

    // Update participant status if part of ACS operation
    await this.supabase
      .from('acs_participants')
      .update({ status: 'returned' })
      .eq('fleet_mission_id', mission.id)

    const message = this.createMessage(
      mission.user_id,
      'battle',
      'Defense Fleet Returned',
      `Your defense fleet has returned from ${this.formatCoords(
        mission.destination_galaxy,
        mission.destination_system,
        mission.destination_position
      )}.`
    )

    return this.successReturn([message], [])
  }
}
