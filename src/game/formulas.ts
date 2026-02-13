/**
 * OGameX Game Formulas
 * All calculations extracted from the original OGameX
 */

import { BUILDINGS, SHIPS, DEFENSE, RESEARCH, UNIVERSE } from './constants'

// ============================================================================
// COST CALCULATIONS
// ============================================================================

/**
 * Calculate the cost of a building at a specific level
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
 * Calculate the cost of research at a specific level
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
 * Calculate the cost of ships/defense units
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
 * Calculate fuel consumption for a fleet
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
 * Get the slowest ship speed in a fleet
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
 * Calculate cargo capacity of a fleet
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

/**
 * Format time duration to human readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B'
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M'
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K'
  }
  return num.toLocaleString()
}
