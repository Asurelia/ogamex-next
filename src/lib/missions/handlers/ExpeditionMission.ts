/**
 * ExpeditionMission Handler
 *
 * Handles expedition missions to position 16 (deep space).
 * Expeditions have random outcomes including:
 * - Finding resources, ships, or dark matter
 * - Combat encounters with pirates or aliens
 * - Navigation events (delays or shortcuts)
 * - Catastrophic black hole events
 *
 * Mission type: 15
 */

import type { MissionType } from '@/types/database'
import { BaseMission } from '../BaseMission'
import {
  MissionContext,
  MissionArrivalResult,
  MissionReturnResult,
  MissionUpdate,
  Resources,
  ShipCounts,
  emptyResources,
  emptyShipCounts,
  getTotalShips,
  SHIP_KEYS,
} from '../types'
import {
  ExpeditionEventType,
  ExpeditionEvent,
  ExpeditionResult,
  EXPEDITION_PROBABILITIES,
  EXPEDITION_MESSAGES,
  FLEET_POWER_TIERS,
} from '@/lib/expeditions/types'

export class ExpeditionMission extends BaseMission {
  readonly missionType: MissionType = 'expedition'
  readonly hasReturn: boolean = true
  readonly name: string = 'Expedition'

  /**
   * Process expedition mission arrival
   *
   * 1. Roll for random event
   * 2. Apply event effects
   * 3. Create return mission with modified cargo/fleet/timing
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission } = context

    const ships = this.getShips(mission)
    const totalShips = getTotalShips(ships)

    if (totalShips <= 0) {
      return this.errorArrival('No ships in fleet')
    }

    // Roll for event
    const event = this.rollExpeditionEvent()

    // Apply event effects
    const result = this.applyEvent(event, ships)

    // Calculate remaining ships after potential losses
    const remainingShips = this.subtractShips(ships, result.shipsLost)

    // Add any gained ships
    const finalShips = this.addShips(remainingShips, result.shipsGained)

    // Format coordinates for message
    const targetCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    // Build expedition report message
    const reportBody = this.buildExpeditionReport(
      targetCoords,
      result,
      ships,
      finalShips
    )

    const message = this.createMessage(
      mission.user_id,
      'expedition',
      'Expedition Report',
      reportBody
    )

    // Update user's dark matter if gained
    if (result.darkMatterGained > 0) {
      await this.addDarkMatter(mission.user_id, result.darkMatterGained)
    }

    // Handle time modifier for return trip
    const updates: MissionUpdate[] = []
    if (result.timeModifier !== 1.0) {
      // Time modifier is handled by creating return mission with modified timing
      // This will be processed by MissionProcessor
    }

    // If all ships were lost (black hole), no return
    if (getTotalShips(finalShips) === 0) {
      return this.successArrival(
        false, // No return
        emptyResources(),
        emptyShipCounts(),
        [message],
        updates
      )
    }

    // Return with resources, ships, and potentially modified timing
    return {
      success: true,
      shouldReturn: true,
      returnResources: result.resourcesGained,
      returnShips: finalShips,
      messages: [message],
      updates,
      // Custom field for time modifier (handled by processor)
      timeModifier: result.timeModifier,
    } as MissionArrivalResult & { timeModifier?: number }
  }

  /**
   * Process expedition return
   *
   * 1. Add resources to origin planet
   * 2. Add ships back to origin planet
   * 3. Send return message
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

    // Add resources to origin planet
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

    const message = this.createMessage(
      mission.user_id,
      'expedition',
      'Expedition Fleet Returned',
      `Your expedition fleet has returned to ${originCoords}.\n\n` +
        `Resources delivered:\n` +
        `Metal: ${resources.metal.toLocaleString()}\n` +
        `Crystal: ${resources.crystal.toLocaleString()}\n` +
        `Deuterium: ${resources.deuterium.toLocaleString()}`
    )

    return this.successReturn([message], [])
  }

  /**
   * Roll for a random expedition event based on probabilities
   */
  private rollExpeditionEvent(): ExpeditionEvent {
    const roll = Math.random() * 100
    let cumulative = 0

    for (const [eventType, probability] of Object.entries(EXPEDITION_PROBABILITIES)) {
      cumulative += probability
      if (roll < cumulative) {
        const type = eventType as ExpeditionEventType
        const messages = EXPEDITION_MESSAGES[type]
        const message = messages[Math.floor(Math.random() * messages.length)]

        return {
          type,
          message,
        }
      }
    }

    // Fallback to nothing
    return {
      type: ExpeditionEventType.NOTHING,
      message: EXPEDITION_MESSAGES[ExpeditionEventType.NOTHING][0],
    }
  }

  /**
   * Apply event effects and calculate results
   */
  private applyEvent(event: ExpeditionEvent, fleet: ShipCounts): ExpeditionResult {
    const fleetPower = this.calculateFleetPower(fleet)
    const powerTier = this.getFleetPowerTier(fleetPower)

    const result: ExpeditionResult = {
      event,
      resourcesGained: emptyResources(),
      darkMatterGained: 0,
      shipsGained: {},
      shipsLost: {},
      timeModifier: 1.0,
    }

    switch (event.type) {
      case ExpeditionEventType.NOTHING:
        // No effect
        break

      case ExpeditionEventType.RESOURCES:
        result.resourcesGained = this.generateResourceReward(powerTier)
        event.resources = result.resourcesGained
        break

      case ExpeditionEventType.SHIPS:
        result.shipsGained = this.generateShipReward(powerTier)
        event.ships = result.shipsGained
        break

      case ExpeditionEventType.DARK_MATTER:
        result.darkMatterGained = this.generateDarkMatterReward(powerTier)
        event.value = result.darkMatterGained
        break

      case ExpeditionEventType.PIRATES:
        result.shipsLost = this.simulatePirateCombat(fleet, powerTier)
        event.ships = result.shipsLost
        break

      case ExpeditionEventType.ALIENS:
        result.shipsLost = this.simulateAlienCombat(fleet, powerTier)
        event.ships = result.shipsLost
        break

      case ExpeditionEventType.BLACK_HOLE:
        result.shipsLost = this.calculateBlackHoleLosses(fleet)
        event.ships = result.shipsLost
        break

      case ExpeditionEventType.DELAY:
        result.timeModifier = 1.5 // 50% slower return
        event.value = 50 // 50% delay
        break

      case ExpeditionEventType.SPEED_BONUS:
        result.timeModifier = 0.5 // 50% faster return
        event.value = 50 // 50% faster
        break
    }

    return result
  }

  /**
   * Calculate fleet power for reward scaling
   */
  private calculateFleetPower(fleet: ShipCounts): number {
    // Simplified power calculation based on ship values
    const shipPower: Record<keyof ShipCounts, number> = {
      light_fighter: 100,
      heavy_fighter: 300,
      cruiser: 2700,
      battleship: 6000,
      battlecruiser: 7000,
      bomber: 7500,
      destroyer: 11000,
      deathstar: 900000,
      small_cargo: 50,
      large_cargo: 150,
      colony_ship: 500,
      recycler: 200,
      espionage_probe: 1,
      reaper: 10000,
      pathfinder: 3000,
    }

    return SHIP_KEYS.reduce((total, key) => {
      return total + fleet[key] * (shipPower[key] || 100)
    }, 0)
  }

  /**
   * Get fleet power tier for scaling rewards
   */
  private getFleetPowerTier(power: number): number {
    if (power >= FLEET_POWER_TIERS.HUGE) return 5
    if (power >= FLEET_POWER_TIERS.LARGE) return 4
    if (power >= FLEET_POWER_TIERS.MEDIUM) return 3
    if (power >= FLEET_POWER_TIERS.SMALL) return 2
    return 1
  }

  /**
   * Generate resource reward based on fleet tier
   */
  private generateResourceReward(tier: number): Resources {
    const baseAmount = 10000 * tier
    const variance = 0.5 + Math.random() // 0.5 to 1.5

    return {
      metal: Math.floor(baseAmount * variance * (0.8 + Math.random() * 0.4)),
      crystal: Math.floor(baseAmount * variance * (0.6 + Math.random() * 0.4)),
      deuterium: Math.floor(baseAmount * variance * (0.3 + Math.random() * 0.2)),
    }
  }

  /**
   * Generate ship reward based on fleet tier
   */
  private generateShipReward(tier: number): Partial<ShipCounts> {
    const ships: Partial<ShipCounts> = {}

    // Possible ships to find (weighted by rarity)
    const possibleShips: Array<{ key: keyof ShipCounts; rarity: number }> = [
      { key: 'small_cargo', rarity: 30 },
      { key: 'large_cargo', rarity: 20 },
      { key: 'light_fighter', rarity: 25 },
      { key: 'heavy_fighter', rarity: 15 },
      { key: 'cruiser', rarity: 10 },
      { key: 'battleship', rarity: 5 },
      { key: 'espionage_probe', rarity: 25 },
      { key: 'recycler', rarity: 10 },
    ]

    // Roll for each ship type
    for (const ship of possibleShips) {
      const roll = Math.random() * 100
      if (roll < ship.rarity) {
        const baseAmount = Math.ceil(tier * (1 + Math.random() * 2))
        ships[ship.key] = baseAmount
      }
    }

    // Ensure at least one ship is found
    if (Object.keys(ships).length === 0) {
      ships.small_cargo = Math.ceil(tier * (1 + Math.random()))
    }

    return ships
  }

  /**
   * Generate dark matter reward
   */
  private generateDarkMatterReward(tier: number): number {
    const base = 50 * tier
    return Math.floor(base * (0.5 + Math.random()))
  }

  /**
   * Simulate pirate combat - generally weak enemies
   */
  private simulatePirateCombat(fleet: ShipCounts, tier: number): Partial<ShipCounts> {
    const losses: Partial<ShipCounts> = {}

    // Pirates are relatively weak - low losses
    const lossPercentage = Math.max(0.01, 0.1 - tier * 0.02)

    for (const key of SHIP_KEYS) {
      if (fleet[key] > 0) {
        const roll = Math.random()
        if (roll < lossPercentage) {
          losses[key] = Math.max(1, Math.floor(fleet[key] * lossPercentage * Math.random()))
        }
      }
    }

    return losses
  }

  /**
   * Simulate alien combat - stronger enemies
   */
  private simulateAlienCombat(fleet: ShipCounts, tier: number): Partial<ShipCounts> {
    const losses: Partial<ShipCounts> = {}

    // Aliens are stronger - moderate losses
    const lossPercentage = Math.max(0.05, 0.2 - tier * 0.03)

    for (const key of SHIP_KEYS) {
      if (fleet[key] > 0) {
        const roll = Math.random()
        if (roll < lossPercentage * 2) {
          losses[key] = Math.max(1, Math.floor(fleet[key] * lossPercentage * Math.random()))
        }
      }
    }

    return losses
  }

  /**
   * Calculate black hole losses - catastrophic
   */
  private calculateBlackHoleLosses(fleet: ShipCounts): Partial<ShipCounts> {
    const losses: Partial<ShipCounts> = {}

    // Black holes are devastating - 30-100% of fleet lost
    const totalLossPercentage = 0.3 + Math.random() * 0.7

    for (const key of SHIP_KEYS) {
      if (fleet[key] > 0) {
        losses[key] = Math.floor(fleet[key] * totalLossPercentage)
      }
    }

    return losses
  }

  /**
   * Subtract ships from fleet
   */
  private subtractShips(fleet: ShipCounts, losses: Partial<ShipCounts>): ShipCounts {
    const result = { ...fleet }
    for (const key of SHIP_KEYS) {
      if (losses[key]) {
        result[key] = Math.max(0, result[key] - losses[key])
      }
    }
    return result
  }

  /**
   * Add ships to fleet
   */
  private addShips(fleet: ShipCounts, gained: Partial<ShipCounts>): ShipCounts {
    const result = { ...fleet }
    for (const key of SHIP_KEYS) {
      if (gained[key]) {
        result[key] = result[key] + gained[key]
      }
    }
    return result
  }

  /**
   * Add dark matter to user
   */
  private async addDarkMatter(userId: string, amount: number): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('dark_matter')
      .eq('id', userId)
      .single()

    if (user) {
      await this.supabase
        .from('users')
        .update({
          dark_matter: user.dark_matter + amount,
        })
        .eq('id', userId)
    }
  }

  /**
   * Build expedition report message
   */
  private buildExpeditionReport(
    coords: string,
    result: ExpeditionResult,
    originalFleet: ShipCounts,
    finalFleet: ShipCounts
  ): string {
    const lines: string[] = [
      `Expedition Report from ${coords}`,
      '',
      result.event.message,
      '',
    ]

    // Add resource gains
    if (result.resourcesGained.metal > 0 || result.resourcesGained.crystal > 0 || result.resourcesGained.deuterium > 0) {
      lines.push('Resources found:')
      if (result.resourcesGained.metal > 0) {
        lines.push(`  Metal: ${result.resourcesGained.metal.toLocaleString()}`)
      }
      if (result.resourcesGained.crystal > 0) {
        lines.push(`  Crystal: ${result.resourcesGained.crystal.toLocaleString()}`)
      }
      if (result.resourcesGained.deuterium > 0) {
        lines.push(`  Deuterium: ${result.resourcesGained.deuterium.toLocaleString()}`)
      }
      lines.push('')
    }

    // Add dark matter gains
    if (result.darkMatterGained > 0) {
      lines.push(`Dark Matter found: ${result.darkMatterGained.toLocaleString()}`)
      lines.push('')
    }

    // Add ship gains
    const gainedShips = Object.entries(result.shipsGained).filter(([, v]) => v && v > 0)
    if (gainedShips.length > 0) {
      lines.push('Ships found:')
      for (const [ship, count] of gainedShips) {
        lines.push(`  ${this.formatShipName(ship)}: ${count}`)
      }
      lines.push('')
    }

    // Add ship losses
    const lostShips = Object.entries(result.shipsLost).filter(([, v]) => v && v > 0)
    if (lostShips.length > 0) {
      lines.push('Ships lost:')
      for (const [ship, count] of lostShips) {
        lines.push(`  ${this.formatShipName(ship)}: ${count}`)
      }
      lines.push('')
    }

    // Add time modifier info
    if (result.timeModifier !== 1.0) {
      if (result.timeModifier < 1.0) {
        lines.push(`Return time reduced by ${Math.round((1 - result.timeModifier) * 100)}%!`)
      } else {
        lines.push(`Return time increased by ${Math.round((result.timeModifier - 1) * 100)}%.`)
      }
      lines.push('')
    }

    // Fleet status
    const totalRemaining = getTotalShips(finalFleet)
    if (totalRemaining === 0) {
      lines.push('The entire fleet was lost.')
    } else {
      lines.push('The fleet is returning to base.')
    }

    return lines.join('\n')
  }

  /**
   * Format ship key to readable name
   */
  private formatShipName(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}
