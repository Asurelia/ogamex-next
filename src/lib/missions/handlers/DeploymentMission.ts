/**
 * DeploymentMission Handler
 *
 * Handles deployment missions (also known as "stationing" or "fleet save").
 * - On arrival: ships and resources are permanently added to target planet
 * - No return trip - ships stay at the target
 *
 * Deployment can ONLY be sent to your OWN planets/moons
 * This is different from Transport which can go to other players
 */

import type { MissionType } from '@/types/database'
import { BaseMission } from '../BaseMission'
import {
  MissionContext,
  MissionArrivalResult,
  MissionReturnResult,
  emptyResources,
  emptyShipCounts,
} from '../types'

export class DeploymentMission extends BaseMission {
  readonly missionType: MissionType = 'deployment'
  readonly hasReturn: boolean = false // Deployment has no return
  readonly name: string = 'Deployment'

  /**
   * Process deployment mission arrival
   *
   * 1. Add ships to target planet permanently
   * 2. Add resources to target planet
   * 3. Send arrival message
   * 4. No return trip
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission, originPlanet, targetPlanet } = context

    // Target planet must exist for deployment
    if (!targetPlanet) {
      return this.errorArrival('Target planet not found')
    }

    // Verify target belongs to the same player (deployment only to own planets)
    if (targetPlanet.user_id !== mission.user_id) {
      return this.errorArrival('Deployment can only be sent to your own planets')
    }

    const resources = this.getResources(mission)
    const ships = this.getShips(mission)

    // Add resources to target planet
    const addResourcesResult = await this.addResourcesToPlanet(targetPlanet.id, resources)
    if (!addResourcesResult.success) {
      return this.errorArrival(`Failed to deliver resources: ${addResourcesResult.error}`)
    }

    // Add ships to target planet (permanent stationing)
    const addShipsResult = await this.addShipsToPlanet(targetPlanet.id, ships)
    if (!addShipsResult.success) {
      return this.errorArrival(`Failed to station ships: ${addShipsResult.error}`)
    }

    // Format coordinates for message
    const originCoords = this.formatCoords(
      mission.origin_galaxy,
      mission.origin_system,
      mission.origin_position
    )
    const targetCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    // Build ship list for message
    const shipList = this.buildShipList(ships as unknown as Record<string, number>)

    // Create arrival message
    // Note: In OGame, deployment refunds 50% of fuel, but that's handled at dispatch time
    const hasResources = resources.metal > 0 || resources.crystal > 0 || resources.deuterium > 0

    let messageBody = `Your fleet has been deployed from ${originCoords} to ${targetCoords}.\n\n`
    messageBody += `Ships stationed:\n${shipList}\n`

    if (hasResources) {
      messageBody += `\nResources delivered:\n`
      messageBody += `Metal: ${resources.metal.toLocaleString()}\n`
      messageBody += `Crystal: ${resources.crystal.toLocaleString()}\n`
      messageBody += `Deuterium: ${resources.deuterium.toLocaleString()}`
    }

    const message = this.createMessage(
      mission.user_id,
      'transport', // Use transport type for deployment messages
      'Fleet Deployed',
      messageBody
    )

    // No return for deployment - ships stay at target
    return this.successArrival(
      false, // shouldReturn = false
      emptyResources(),
      emptyShipCounts(),
      [message],
      []
    )
  }

  /**
   * Process deployment return
   *
   * Deployment missions do NOT have a return trip normally.
   * This method handles the edge case of a CANCELLED deployment
   * that was recalled before arrival.
   */
  async processReturn(context: MissionContext): Promise<MissionReturnResult> {
    const { mission, originPlanet } = context

    // This shouldn't happen in normal operation, but handle it gracefully
    // This could occur if the mission was cancelled/recalled

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

    // Add resources back
    if (resources.metal > 0 || resources.crystal > 0 || resources.deuterium > 0) {
      const addResourcesResult = await this.addResourcesToPlanet(originPlanet.id, resources)
      if (!addResourcesResult.success) {
        return this.errorReturn(`Failed to return resources: ${addResourcesResult.error}`)
      }
    }

    // Create return message (for recalled deployment)
    const targetCoords = this.formatCoords(
      mission.origin_galaxy, // Origin in return mission = original destination
      mission.origin_system,
      mission.origin_position
    )
    const originCoords = this.formatCoords(
      mission.destination_galaxy, // Destination in return = original origin
      mission.destination_system,
      mission.destination_position
    )

    const message = this.createMessage(
      mission.user_id,
      'transport',
      'Fleet Returned',
      `Your recalled deployment fleet has returned from ${targetCoords} to ${originCoords}.`
    )

    return this.successReturn([message], [])
  }

  /**
   * Build a formatted ship list for messages
   */
  private buildShipList(ships: Record<string, number>): string {
    const shipNames: Record<string, string> = {
      light_fighter: 'Light Fighter',
      heavy_fighter: 'Heavy Fighter',
      cruiser: 'Cruiser',
      battleship: 'Battleship',
      battlecruiser: 'Battlecruiser',
      bomber: 'Bomber',
      destroyer: 'Destroyer',
      deathstar: 'Deathstar',
      small_cargo: 'Small Cargo',
      large_cargo: 'Large Cargo',
      colony_ship: 'Colony Ship',
      recycler: 'Recycler',
      espionage_probe: 'Espionage Probe',
      reaper: 'Reaper',
      pathfinder: 'Pathfinder',
    }

    const lines: string[] = []

    for (const [key, name] of Object.entries(shipNames)) {
      const count = ships[key] || 0
      if (count > 0) {
        lines.push(`  ${name}: ${count.toLocaleString()}`)
      }
    }

    return lines.length > 0 ? lines.join('\n') : '  None'
  }
}
