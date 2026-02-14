/**
 * TransportMission Handler
 *
 * Handles transport missions that deliver resources to another planet.
 * - On arrival: delivers resources to target planet, fleet returns empty
 * - On return: fleet returns to origin planet
 *
 * Transport missions can be sent to any planet (own or other players')
 */

import type { MissionType } from '@/types/database'
import { BaseMission } from '../BaseMission'
import {
  MissionContext,
  MissionArrivalResult,
  MissionReturnResult,
  Resources,
  emptyResources,
} from '../types'

export class TransportMission extends BaseMission {
  readonly missionType: MissionType = 'transport'
  readonly hasReturn: boolean = true
  readonly name: string = 'Transport'

  /**
   * Process transport mission arrival
   *
   * 1. Deliver resources to target planet
   * 2. Send messages to both players (if different)
   * 3. Fleet returns empty
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission, originPlanet, targetPlanet } = context

    // Target planet must exist for transport
    if (!targetPlanet) {
      return this.errorArrival('Target planet not found')
    }

    const resources = this.getResources(mission)
    const ships = this.getShips(mission)

    // Add resources to target planet
    const addResult = await this.addResourcesToPlanet(targetPlanet.id, resources)
    if (!addResult.success) {
      return this.errorArrival(`Failed to deliver resources: ${addResult.error}`)
    }

    // Format coordinates for messages
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

    // Create messages
    const messages = []

    // Message to fleet owner (origin player)
    const ownerMessage = this.createMessage(
      mission.user_id,
      'transport',
      'Transport Arrived',
      `Your transport fleet has arrived at ${targetCoords} and delivered:\n` +
        `Metal: ${resources.metal.toLocaleString()}\n` +
        `Crystal: ${resources.crystal.toLocaleString()}\n` +
        `Deuterium: ${resources.deuterium.toLocaleString()}\n` +
        `The fleet is now returning to ${originCoords}.`
    )
    messages.push(ownerMessage)

    // If target is a different player, send them a message too
    if (targetPlanet.user_id !== mission.user_id) {
      const receiverMessage = this.createMessage(
        targetPlanet.user_id,
        'transport',
        'Transport Received',
        `A transport fleet from ${originCoords} has delivered resources to your planet ${targetCoords}:\n` +
          `Metal: ${resources.metal.toLocaleString()}\n` +
          `Crystal: ${resources.crystal.toLocaleString()}\n` +
          `Deuterium: ${resources.deuterium.toLocaleString()}`
      )
      messages.push(receiverMessage)
    }

    // Return with ships but no resources (all delivered)
    return this.successArrival(
      true, // shouldReturn
      emptyResources(), // returnResources - empty, all delivered
      ships, // returnShips - all ships return
      messages,
      []
    )
  }

  /**
   * Process transport mission return
   *
   * 1. Add ships back to origin planet
   * 2. Send return message to player
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

    // If there are any resources (shouldn't happen in normal transport, but handle it)
    if (resources.metal > 0 || resources.crystal > 0 || resources.deuterium > 0) {
      const addResourcesResult = await this.addResourcesToPlanet(originPlanet.id, resources)
      if (!addResourcesResult.success) {
        return this.errorReturn(`Failed to return resources: ${addResourcesResult.error}`)
      }
    }

    // Format coordinates
    const originCoords = this.formatCoords(
      mission.destination_galaxy, // For return, destination is the original origin
      mission.destination_system,
      mission.destination_position
    )
    const returnFromCoords = this.formatCoords(
      mission.origin_galaxy, // For return, origin is where we're coming from
      mission.origin_system,
      mission.origin_position
    )

    // Create return message
    const message = this.createMessage(
      mission.user_id,
      'transport',
      'Fleet Returned',
      `Your fleet has returned from transport mission to ${returnFromCoords} and arrived at ${originCoords}.`
    )

    return this.successReturn([message], [])
  }
}
