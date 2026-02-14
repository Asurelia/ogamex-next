/**
 * MoonDestructionMission Handler
 *
 * Handles moon destruction missions (mission type 9).
 * Uses Deathstars (RIPs) to attempt to destroy enemy moons.
 *
 * Mechanics:
 * - Moon destruction chance: (100 - sqrt(diameter)) * ripsCount / 100
 * - RIP destruction chance: sqrt(diameter) / 2
 *
 * Possible outcomes:
 * 1. Moon destroyed, RIPs survive
 * 2. Moon survives, RIPs destroyed
 * 3. Both moon and RIPs destroyed
 * 4. Both survive (unlikely but possible)
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
  hasResources,
  SHIP_KEYS,
} from '../types'
import { MoonService, createMoonService } from '../../moons/MoonService'
import { MOON_DESTRUCTION } from '../../moons/constants'

export class MoonDestructionMission extends BaseMission {
  readonly missionType: MissionType = 'moon_destruction'
  readonly hasReturn: boolean = true
  readonly name: string = 'Moon Destruction'

  /**
   * Process moon destruction mission arrival
   *
   * 1. Verify target is a moon
   * 2. Calculate destruction chances
   * 3. Roll for moon destruction
   * 4. Roll for RIP destruction
   * 5. Apply results
   * 6. Generate messages
   * 7. Return surviving fleet
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission, targetPlanet } = context

    const ships = this.getShips(mission)
    const resources = this.getResources(mission)
    const ripsCount = ships.deathstar || 0

    // Check if we have Deathstars
    if (ripsCount <= 0) {
      const message = this.createMessage(
        mission.user_id,
        'battle',
        'Moon Destruction Failed',
        `Your fleet arrived at ${this.formatCoords(
          mission.destination_galaxy,
          mission.destination_system,
          mission.destination_position
        )} but had no Deathstars. The fleet is returning.`
      )

      return this.successArrival(true, resources, ships, [message], [])
    }

    // Target must be a moon
    if (!targetPlanet || targetPlanet.planet_type !== 'moon') {
      const message = this.createMessage(
        mission.user_id,
        'battle',
        'Moon Destruction Failed',
        `Your fleet arrived at ${this.formatCoords(
          mission.destination_galaxy,
          mission.destination_system,
          mission.destination_position
        )} but found no moon. The fleet is returning.`
      )

      return this.successArrival(true, resources, ships, [message], [])
    }

    // Cannot destroy own moon
    if (targetPlanet.user_id === mission.user_id) {
      const message = this.createMessage(
        mission.user_id,
        'battle',
        'Moon Destruction Cancelled',
        `You cannot destroy your own moon at ${this.formatCoords(
          mission.destination_galaxy,
          mission.destination_system,
          mission.destination_position
        )}. The fleet is returning.`
      )

      return this.successArrival(true, resources, ships, [message], [])
    }

    // Calculate chances
    const { moonDestroyChance, ripDestroyChance } = this.calculateChances(
      targetPlanet.diameter || 4000,
      ripsCount
    )

    // Roll for outcomes
    const moonRoll = Math.random() * 100
    const ripRoll = Math.random() * 100

    const moonDestroyed = moonRoll <= moonDestroyChance
    const ripsDestroyed = ripRoll <= ripDestroyChance

    // Apply moon destruction
    if (moonDestroyed) {
      await this.destroyMoon(targetPlanet.id)
    }

    // Prepare return fleet
    const returnShips = { ...ships }
    if (ripsDestroyed) {
      returnShips.deathstar = 0
    }

    // Calculate if fleet has any ships remaining
    const hasRemainingShips = SHIP_KEYS.some((key) => returnShips[key] > 0)

    // Generate messages
    const messages = this.createMoonDestructionMessages(
      mission,
      targetPlanet,
      moonDestroyed,
      ripsDestroyed,
      ripsCount,
      moonDestroyChance,
      ripDestroyChance
    )

    // Return result
    if (!hasRemainingShips) {
      // All ships destroyed, no return
      return this.successArrival(false, emptyResources(), emptyShipCounts(), messages, [])
    }

    return this.successArrival(true, resources, returnShips, messages, [])
  }

  /**
   * Process moon destruction mission return
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

    // Add resources if any
    if (hasResources(resources)) {
      const addResourcesResult = await this.addResourcesToPlanet(originPlanet.id, resources)
      if (!addResourcesResult.success) {
        return this.errorReturn(`Failed to return resources: ${addResourcesResult.error}`)
      }
    }

    // Create return message
    const destCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    const message = this.createMessage(
      mission.user_id,
      'battle',
      'Fleet Returned',
      `Your fleet has returned from the moon destruction mission to ${destCoords}.`
    )

    return this.successReturn([message], [])
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate destruction chances
   */
  private calculateChances(
    moonDiameter: number,
    ripsCount: number
  ): { moonDestroyChance: number; ripDestroyChance: number } {
    return {
      moonDestroyChance: MOON_DESTRUCTION.moonDestroyChance(moonDiameter, ripsCount),
      ripDestroyChance: MOON_DESTRUCTION.ripDestroyChance(moonDiameter),
    }
  }

  /**
   * Destroy a moon
   */
  private async destroyMoon(moonId: string): Promise<void> {
    // First, move any ships on the moon to debris (they're lost)
    // Then delete the moon
    await this.supabase.from('planets').delete().eq('id', moonId)
  }

  /**
   * Create messages for both attacker and defender
   */
  private createMoonDestructionMessages(
    mission: {
      user_id: string
      destination_galaxy: number
      destination_system: number
      destination_position: number
    },
    targetPlanet: { user_id: string; name: string; diameter?: number },
    moonDestroyed: boolean,
    ripsDestroyed: boolean,
    ripsCount: number,
    moonDestroyChance: number,
    ripDestroyChance: number
  ): ReturnType<typeof this.createMessage>[] {
    const messages: ReturnType<typeof this.createMessage>[] = []

    const targetCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    // Determine outcome text
    let outcomeText: string
    if (moonDestroyed && ripsDestroyed) {
      outcomeText = 'The moon was destroyed, but so was your entire Deathstar fleet!'
    } else if (moonDestroyed && !ripsDestroyed) {
      outcomeText = 'Mission successful! The moon has been destroyed and your fleet survived.'
    } else if (!moonDestroyed && ripsDestroyed) {
      outcomeText = 'Mission failed! The moon survived and your Deathstar fleet was destroyed.'
    } else {
      outcomeText = 'Both the moon and your fleet survived. The mission was a draw.'
    }

    // Attacker message
    const attackerMessage = this.createMessage(
      mission.user_id,
      'battle',
      `Moon Destruction Report - ${targetCoords}`,
      `Your Deathstar fleet (${ripsCount} ships) attacked the moon at ${targetCoords}.\n\n` +
        `Moon destruction chance: ${moonDestroyChance.toFixed(2)}%\n` +
        `Fleet destruction chance: ${ripDestroyChance.toFixed(2)}%\n\n` +
        `${outcomeText}\n\n` +
        `Moon destroyed: ${moonDestroyed ? 'Yes' : 'No'}\n` +
        `Deathstars lost: ${ripsDestroyed ? ripsCount : 0}`
    )
    messages.push(attackerMessage)

    // Defender outcome text
    let defenderOutcomeText: string
    if (moonDestroyed && ripsDestroyed) {
      defenderOutcomeText = 'Your moon was destroyed, but you managed to destroy the attacking Deathstar fleet!'
    } else if (moonDestroyed && !ripsDestroyed) {
      defenderOutcomeText = 'Your moon has been destroyed!'
    } else if (!moonDestroyed && ripsDestroyed) {
      defenderOutcomeText = 'Your moon defended itself and the attacking Deathstar fleet was destroyed!'
    } else {
      defenderOutcomeText = 'Your moon survived the attack and the enemy fleet retreated.'
    }

    // Defender message
    const defenderMessage = this.createMessage(
      targetPlanet.user_id,
      'battle',
      `Moon Under Attack - ${targetCoords}`,
      `Your moon "${targetPlanet.name}" at ${targetCoords} was attacked by a Deathstar fleet!\n\n` +
        `Enemy Deathstars: ${ripsCount}\n\n` +
        `${defenderOutcomeText}\n\n` +
        `Moon status: ${moonDestroyed ? 'DESTROYED' : 'Survived'}`
    )
    messages.push(defenderMessage)

    return messages
  }
}
