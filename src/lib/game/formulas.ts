/**
 * OGameX Game Formulas
 * All calculations extracted from the original OGameX
 *
 * Note: Many functions require game data (ships, buildings, etc.) from the config.
 * For functions that depend on data, use the async versions from config-cache.ts.
 */

import { UNIVERSE } from './constants'

// ============================================================================
// COST CALCULATIONS (Pure functions - no external data dependency)
// ============================================================================

/**
 * Calculate the cost of a building at a specific level
 * @param baseCost - The base cost object { metal, crystal, deuterium }
 * @param priceFactor - The price multiplier per level
 * @param level - The target level
 */
export function calculateBuildingCostFromBase(
  baseCost: { metal: number; crystal: number; deuterium: number },
  priceFactor: number,
  level: number
): { metal: number; crystal: number; deuterium: number } {
  const factor = Math.pow(priceFactor, level - 1)
  return {
    metal: Math.floor(baseCost.metal * factor),
    crystal: Math.floor(baseCost.crystal * factor),
    deuterium: Math.floor(baseCost.deuterium * factor),
  }
}

/**
 * Calculate the cost of research at a specific level
 * @param baseCost - The base cost object { metal, crystal, deuterium }
 * @param priceFactor - The price multiplier per level
 * @param level - The target level
 */
export function calculateResearchCostFromBase(
  baseCost: { metal: number; crystal: number; deuterium: number },
  priceFactor: number,
  level: number
): { metal: number; crystal: number; deuterium: number } {
  const factor = Math.pow(priceFactor, level - 1)
  return {
    metal: Math.floor(baseCost.metal * factor),
    crystal: Math.floor(baseCost.crystal * factor),
    deuterium: Math.floor(baseCost.deuterium * factor),
  }
}

/**
 * Calculate the cost of units (ships/defense)
 * @param unitCost - The unit cost object { metal, crystal, deuterium }
 * @param amount - Number of units
 */
export function calculateUnitCostFromBase(
  unitCost: { metal: number; crystal: number; deuterium: number },
  amount: number
): { metal: number; crystal: number; deuterium: number } {
  return {
    metal: unitCost.metal * amount,
    crystal: unitCost.crystal * amount,
    deuterium: unitCost.deuterium * amount,
  }
}

// ============================================================================
// TIME CALCULATIONS
// ============================================================================

/**
 * Calculate building construction time in seconds
 */
export function calculateBuildingTime(
  metalCost: number,
  crystalCost: number,
  robotFactoryLevel: number,
  naniteFactoryLevel: number,
  universeSpeed: number = 1,
  isNaniteFactory: boolean = false
): number {
  const baseCost = metalCost + crystalCost

  let time: number
  if (isNaniteFactory) {
    // Nanite Factory has special formula
    time = baseCost / (2500 * (1 + robotFactoryLevel) * universeSpeed * Math.pow(2, naniteFactoryLevel))
  } else {
    // Normal buildings
    const levelFactor = Math.max(4 - (robotFactoryLevel / 2), 1)
    time = baseCost / (2500 * levelFactor * (1 + robotFactoryLevel) * universeSpeed * Math.pow(2, naniteFactoryLevel))
  }

  // Convert to seconds, minimum 1 second
  return Math.max(1, Math.floor(time * 3600))
}

/**
 * Calculate unit (ship/defense) build time in seconds
 */
export function calculateUnitTime(
  structuralIntegrity: number,
  shipyardLevel: number,
  naniteFactoryLevel: number,
  universeSpeed: number = 1
): number {
  const time = structuralIntegrity / (2500 * (1 + shipyardLevel) * universeSpeed * Math.pow(2, naniteFactoryLevel))
  return Math.max(1, Math.floor(time * 3600))
}

/**
 * Calculate research time in seconds
 */
export function calculateResearchTime(
  metalCost: number,
  crystalCost: number,
  researchLabLevel: number,
  universeSpeed: number = 1,
  researchSpeed: number = 1,
  characterClassMultiplier: number = 1 // Discoverer gets 0.75
): number {
  const baseCost = metalCost + crystalCost
  const time = baseCost / (1000 * (1 + researchLabLevel) * universeSpeed * researchSpeed)
  return Math.max(1, Math.floor(time * 3600 * characterClassMultiplier))
}

// ============================================================================
// PRODUCTION CALCULATIONS
// ============================================================================

/**
 * Calculate metal mine production per hour
 */
export function calculateMetalProduction(
  mineLevel: number,
  universeSpeed: number = 1,
  productionPercent: number = 100,
  plasmaLevel: number = 0
): number {
  if (mineLevel === 0) return 0

  const baseProduction = 30 * mineLevel * Math.pow(1.1, mineLevel)
  const plasmaBonus = 1 + (plasmaLevel * 0.01)

  return Math.floor(baseProduction * universeSpeed * (productionPercent / 100) * plasmaBonus)
}

/**
 * Calculate crystal mine production per hour
 */
export function calculateCrystalProduction(
  mineLevel: number,
  universeSpeed: number = 1,
  productionPercent: number = 100,
  plasmaLevel: number = 0
): number {
  if (mineLevel === 0) return 0

  const baseProduction = 20 * mineLevel * Math.pow(1.1, mineLevel)
  const plasmaBonus = 1 + (plasmaLevel * 0.0066)

  return Math.floor(baseProduction * universeSpeed * (productionPercent / 100) * plasmaBonus)
}

/**
 * Calculate deuterium synthesizer production per hour
 */
export function calculateDeuteriumProduction(
  synthLevel: number,
  maxTemp: number,
  universeSpeed: number = 1,
  productionPercent: number = 100,
  plasmaLevel: number = 0
): number {
  if (synthLevel === 0) return 0

  const tempFactor = 1.44 - 0.004 * maxTemp
  const baseProduction = 10 * synthLevel * Math.pow(1.1, synthLevel) * tempFactor
  const plasmaBonus = 1 + (plasmaLevel * 0.0033)

  return Math.floor(baseProduction * universeSpeed * (productionPercent / 100) * plasmaBonus)
}

/**
 * Calculate solar plant energy production
 */
export function calculateSolarPlantEnergy(level: number): number {
  if (level === 0) return 0
  return Math.floor(20 * level * Math.pow(1.1, level))
}

/**
 * Calculate fusion reactor energy production
 */
export function calculateFusionEnergy(level: number, energyTechLevel: number): number {
  if (level === 0) return 0
  return Math.floor(30 * level * Math.pow(1.05 + energyTechLevel * 0.01, level))
}

/**
 * Calculate energy consumption for a mine
 */
export function calculateMineEnergyConsumption(mineLevel: number, mineType: 'metal' | 'crystal' | 'deuterium'): number {
  if (mineLevel === 0) return 0

  const baseFactor = mineType === 'deuterium' ? 20 : 10
  return Math.floor(baseFactor * mineLevel * Math.pow(1.1, mineLevel))
}

/**
 * Calculate storage capacity
 */
export function calculateStorageCapacity(storageLevel: number): number {
  return Math.floor(5000 * Math.floor(2.5 * Math.exp(20 * storageLevel / 33)))
}

// ============================================================================
// FLEET CALCULATIONS
// ============================================================================

/**
 * Calculate distance between two coordinates
 */
export function calculateDistance(
  galaxy1: number, system1: number, position1: number,
  galaxy2: number, system2: number, position2: number,
  maxGalaxies: number = UNIVERSE.MAX_GALAXY,
  maxSystems: number = UNIVERSE.MAX_SYSTEM
): number {
  // Different galaxies
  if (galaxy1 !== galaxy2) {
    const galaxyDiff = Math.abs(galaxy1 - galaxy2)
    const wrappedDiff = Math.min(galaxyDiff, maxGalaxies - galaxyDiff)
    return wrappedDiff * 20000
  }

  // Same galaxy, different systems
  if (system1 !== system2) {
    const systemDiff = Math.abs(system1 - system2)
    const wrappedDiff = Math.min(systemDiff, maxSystems - systemDiff)
    return wrappedDiff * 5 * 19 + 2700
  }

  // Same system, different positions
  if (position1 !== position2) {
    return Math.abs(position1 - position2) * 5 + 1000
  }

  // Same position
  return 5
}

/**
 * Calculate fleet mission duration in seconds
 */
export function calculateFleetDuration(
  distance: number,
  slowestShipSpeed: number,
  speedPercent: number = 100,
  fleetSpeed: number = 1
): number {
  const speedFactor = speedPercent / 100
  const duration = (35000 / speedFactor * Math.sqrt(distance * 10 / slowestShipSpeed) + 10) / fleetSpeed
  return Math.max(1, Math.round(duration))
}

/**
 * Calculate fuel consumption for a single ship type
 * @param shipFuelConsumption - Base fuel consumption of the ship
 * @param shipSpeed - Base speed of the ship
 * @param amount - Number of ships
 * @param distance - Distance of the mission
 * @param duration - Duration of the mission
 * @param speedPercent - Speed percentage (1-100)
 */
export function calculateShipFuelConsumption(
  shipFuelConsumption: number,
  shipSpeed: number,
  amount: number,
  distance: number,
  duration: number,
  speedPercent: number = 100
): number {
  if (amount <= 0) return 0

  const speedValue = Math.max(0.5, duration * (speedPercent / 100) - 10)
  const shipSpeedValue = 35000 / speedValue * Math.sqrt(distance * 10 / shipSpeed)

  return Math.max(
    shipFuelConsumption * amount * distance / 35000 * Math.pow(shipSpeedValue / 10 + 1, 2),
    1
  )
}

/**
 * Calculate cargo capacity with hyperspace tech bonus
 * @param baseCapacity - Base cargo capacity sum
 * @param hyperspaceTechLevel - Level of hyperspace technology
 */
export function calculateCargoCapacityWithBonus(
  baseCapacity: number,
  hyperspaceTechLevel: number = 0
): number {
  const bonusMultiplier = 1 + hyperspaceTechLevel * 0.05
  return Math.floor(baseCapacity * bonusMultiplier)
}

// ============================================================================
// COMBAT CALCULATIONS
// ============================================================================

/**
 * Calculate attack power with weapons technology
 */
export function calculateAttackPower(baseAttack: number, weaponsTechLevel: number): number {
  return Math.floor(baseAttack * (1 + weaponsTechLevel * 0.1))
}

/**
 * Calculate shield power with shielding technology
 */
export function calculateShieldPower(baseShield: number, shieldingTechLevel: number): number {
  return Math.floor(baseShield * (1 + shieldingTechLevel * 0.1))
}

/**
 * Calculate structural integrity with armor technology
 */
export function calculateArmor(baseArmor: number, armorTechLevel: number): number {
  return Math.floor(baseArmor * (1 + armorTechLevel * 0.1))
}

// ============================================================================
// MISC CALCULATIONS
// ============================================================================

/**
 * Calculate max fleet slots (based on computer technology)
 */
export function calculateMaxFleetSlots(computerTechLevel: number): number {
  return 1 + computerTechLevel
}

/**
 * Calculate max colonies (based on astrophysics)
 */
export function calculateMaxColonies(astrophysicsLevel: number): number {
  return Math.floor(astrophysicsLevel / 2)
}

/**
 * Calculate max expeditions (based on astrophysics)
 */
export function calculateMaxExpeditions(astrophysicsLevel: number): number {
  return Math.floor(Math.sqrt(astrophysicsLevel))
}

/**
 * Calculate planet fields based on diameter
 */
export function calculatePlanetFields(diameter: number): number {
  return Math.floor(Math.pow(diameter / 1000, 2))
}

/**
 * Generate random planet diameter based on position
 */
export function generatePlanetDiameter(position: number): number {
  // Planets closer to sun are smaller, middle positions are largest
  const baseDiameter = {
    1: 50, 2: 80, 3: 90, 4: 120, 5: 140,
    6: 150, 7: 160, 8: 170, 9: 180, 10: 160,
    11: 140, 12: 120, 13: 100, 14: 80, 15: 60,
  }[position] ?? 100

  // Add random variation (-20% to +20%)
  const variation = 0.8 + Math.random() * 0.4
  return Math.floor(baseDiameter * 100 * variation)
}

/**
 * Calculate planet temperature based on position
 */
export function calculatePlanetTemperature(position: number): { min: number; max: number } {
  // Temperature decreases as you move away from the sun
  const baseMax = 130 - (position * 15)
  const range = 40

  return {
    min: baseMax - range,
    max: baseMax,
  }
}

// Re-export formatting utilities from centralized location
export { formatNumber, formatDuration, formatRelativeTime } from '@/lib/utils/format'
