/**
 * @deprecated This file is deprecated. Import from '@/lib/game' instead.
 *
 * Migration guide:
 * ```typescript
 * // Before
 * import { calculateDistance, formatNumber } from '@/game/formulas'
 *
 * // After
 * import { calculateDistance, formatNumber } from '@/lib/game'
 * ```
 *
 * This file re-exports everything for backward compatibility during migration.
 */

// Re-export all formulas from the new location
export {
  // Cost calculations (renamed for clarity)
  calculateBuildingCostFromBase,
  calculateResearchCostFromBase,
  calculateUnitCostFromBase,
  // Time calculations
  calculateBuildingTime,
  calculateUnitTime,
  calculateResearchTime,
  // Production calculations
  calculateMetalProduction,
  calculateCrystalProduction,
  calculateDeuteriumProduction,
  calculateSolarPlantEnergy,
  calculateFusionEnergy,
  calculateMineEnergyConsumption,
  calculateStorageCapacity,
  // Fleet calculations
  calculateDistance,
  calculateFleetDuration,
  calculateShipFuelConsumption,
  calculateCargoCapacityWithBonus,
  // Combat calculations
  calculateAttackPower,
  calculateShieldPower,
  calculateArmor,
  // Misc calculations
  calculateMaxFleetSlots,
  calculateMaxColonies,
  calculateMaxExpeditions,
  calculatePlanetFields,
  generatePlanetDiameter,
  calculatePlanetTemperature,
  // Formatting utilities
  formatNumber,
  formatDuration,
  formatRelativeTime,
} from '@/lib/game/formulas'

// Re-export UNIVERSE for backward compatibility
export { UNIVERSE } from '@/lib/game/constants'

// ============================================================================
// LEGACY FUNCTION SIGNATURES (for backward compatibility)
// These wrap the new functions to maintain the old API during migration.
// ============================================================================

import { SHIPS, BUILDINGS, RESEARCH, DEFENSE } from './constants'

/**
 * @deprecated Use calculateBuildingCostFromBase with building data from getCachedGameConfig()
 */
export function calculateBuildingCost(
  buildingId: number,
  level: number
): { metal: number; crystal: number; deuterium: number } {
  const building = BUILDINGS[buildingId]
  if (!building) throw new Error(`Unknown building: ${buildingId}`)

  const factor = Math.pow(building.priceFactor, level - 1)

  return {
    metal: Math.floor(building.baseCost.metal * factor),
    crystal: Math.floor(building.baseCost.crystal * factor),
    deuterium: Math.floor(building.baseCost.deuterium * factor),
  }
}

/**
 * @deprecated Use calculateResearchCostFromBase with research data from getCachedGameConfig()
 */
export function calculateResearchCost(
  researchId: number,
  level: number
): { metal: number; crystal: number; deuterium: number } {
  const research = RESEARCH[researchId]
  if (!research) throw new Error(`Unknown research: ${researchId}`)

  const factor = Math.pow(research.priceFactor, level - 1)

  return {
    metal: Math.floor(research.baseCost.metal * factor),
    crystal: Math.floor(research.baseCost.crystal * factor),
    deuterium: Math.floor(research.baseCost.deuterium * factor),
  }
}

/**
 * @deprecated Use calculateUnitCostFromBase with ship/defense data from getCachedGameConfig()
 */
export function calculateUnitCost(
  unitId: number,
  amount: number,
  type: 'ship' | 'defense'
): { metal: number; crystal: number; deuterium: number } {
  const unit = type === 'ship' ? SHIPS[unitId] : DEFENSE[unitId]
  if (!unit) throw new Error(`Unknown ${type}: ${unitId}`)

  return {
    metal: unit.cost.metal * amount,
    crystal: unit.cost.crystal * amount,
    deuterium: unit.cost.deuterium * amount,
  }
}

/**
 * @deprecated Use calculateShipFuelConsumption with ship data from getCachedGameConfig()
 */
export function calculateFuelConsumption(
  ships: Array<{ shipId: number; amount: number }>,
  distance: number,
  duration: number,
  speedPercent: number = 100
): number {
  let totalFuel = 0

  for (const { shipId, amount } of ships) {
    const ship = SHIPS[shipId]
    if (!ship || amount <= 0) continue

    const speedValue = Math.max(0.5, duration * (speedPercent / 100) - 10)
    const shipSpeedValue = 35000 / speedValue * Math.sqrt(distance * 10 / ship.speed)

    const consumption = Math.max(
      ship.fuelConsumption * amount * distance / 35000 * Math.pow(shipSpeedValue / 10 + 1, 2),
      1
    )

    totalFuel += consumption
  }

  return Math.round(totalFuel)
}

/**
 * @deprecated Use ship data from getCachedGameConfig() instead
 */
export function getSlowestShipSpeed(
  ships: Array<{ shipId: number; amount: number }>,
  combustionLevel: number = 0,
  impulseLevel: number = 0,
  hyperspaceLevel: number = 0
): number {
  let slowest = Infinity

  for (const { shipId, amount } of ships) {
    if (amount <= 0) continue

    const ship = SHIPS[shipId]
    if (!ship) continue

    let speed = ship.speed

    // Apply drive bonuses
    switch (ship.driveType) {
      case 'combustion':
        speed *= (1 + combustionLevel * 0.1)
        break
      case 'impulse':
        speed *= (1 + impulseLevel * 0.2)
        break
      case 'hyperspace':
        speed *= (1 + hyperspaceLevel * 0.3)
        break
    }

    if (speed < slowest) {
      slowest = speed
    }
  }

  return slowest === Infinity ? 0 : Math.floor(slowest)
}

/**
 * @deprecated Use calculateCargoCapacityWithBonus with ship data from getCachedGameConfig()
 */
export function calculateCargoCapacity(
  ships: Array<{ shipId: number; amount: number }>,
  hyperspaceTechLevel: number = 0
): number {
  let total = 0
  const bonusMultiplier = 1 + hyperspaceTechLevel * 0.05

  for (const { shipId, amount } of ships) {
    const ship = SHIPS[shipId]
    if (!ship || amount <= 0) continue

    total += ship.cargoCapacity * amount
  }

  return Math.floor(total * bonusMultiplier)
}
