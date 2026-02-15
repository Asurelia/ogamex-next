/**
 * Exploration Missions Tests
 * Tests for Sprint 2: Missions d'Exploration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  EXPLORATION_MISSION_CONFIG,
  SCAN_QUALITY_LIMITS,
  SPECIAL_FINDING_CONFIG,
  type ExplorationMissionType,
  type ExplorationMissionConfig,
  type SpecialFinding,
  type CalculateScanQualityParams,
} from '../types'

// ============================================================================
// SCAN QUALITY CALCULATION TESTS
// ============================================================================

describe('Scan Quality Calculation', () => {
  const calculateScanQuality = (params: CalculateScanQualityParams): number => {
    const {
      probeCount,
      explorerCount,
      cartographerEquipped,
      explorationTechLevel,
      missionType,
    } = params

    const config = EXPLORATION_MISSION_CONFIG[missionType]
    let quality = config.baseQuality

    // Probe bonus
    quality += Math.min(
      probeCount * SCAN_QUALITY_LIMITS.PROBE_PER_UNIT,
      SCAN_QUALITY_LIMITS.PROBE_MAX
    )

    // Explorer bonus
    quality += Math.min(
      explorerCount * SCAN_QUALITY_LIMITS.EXPLORER_PER_UNIT,
      SCAN_QUALITY_LIMITS.EXPLORER_MAX
    )

    // Cartographer bonus
    if (cartographerEquipped) {
      quality += SCAN_QUALITY_LIMITS.CARTOGRAPHER
    }

    // Tech level bonus
    quality += explorationTechLevel * SCAN_QUALITY_LIMITS.TECH_PER_LEVEL

    return Math.min(quality, SCAN_QUALITY_LIMITS.MAX_QUALITY)
  }

  describe('Quick Scan Mission', () => {
    it('should have base quality of 20', () => {
      const quality = calculateScanQuality({
        probeCount: 0,
        explorerCount: 0,
        cartographerEquipped: false,
        explorationTechLevel: 0,
        missionType: 'quick_scan',
      })
      expect(quality).toBe(20)
    })

    it('should add probe bonus (2 per probe, max 20)', () => {
      // 5 probes = 10 bonus
      const quality1 = calculateScanQuality({
        probeCount: 5,
        explorerCount: 0,
        cartographerEquipped: false,
        explorationTechLevel: 0,
        missionType: 'quick_scan',
      })
      expect(quality1).toBe(30)

      // 15 probes = 20 bonus (capped)
      const quality2 = calculateScanQuality({
        probeCount: 15,
        explorerCount: 0,
        cartographerEquipped: false,
        explorationTechLevel: 0,
        missionType: 'quick_scan',
      })
      expect(quality2).toBe(40)
    })

    it('should add explorer bonus (5 per explorer, max 25)', () => {
      const quality = calculateScanQuality({
        probeCount: 0,
        explorerCount: 3,
        cartographerEquipped: false,
        explorationTechLevel: 0,
        missionType: 'quick_scan',
      })
      expect(quality).toBe(35) // 20 base + 15 explorer
    })

    it('should add tech level bonus (2 per level)', () => {
      const quality = calculateScanQuality({
        probeCount: 0,
        explorerCount: 0,
        cartographerEquipped: false,
        explorationTechLevel: 5,
        missionType: 'quick_scan',
      })
      expect(quality).toBe(30) // 20 base + 10 tech
    })
  })

  describe('Deep Scan Mission', () => {
    it('should have base quality of 50', () => {
      const quality = calculateScanQuality({
        probeCount: 0,
        explorerCount: 0,
        cartographerEquipped: false,
        explorationTechLevel: 0,
        missionType: 'deep_scan',
      })
      expect(quality).toBe(50)
    })

    it('should combine all bonuses', () => {
      const quality = calculateScanQuality({
        probeCount: 10,
        explorerCount: 5,
        cartographerEquipped: false,
        explorationTechLevel: 3,
        missionType: 'deep_scan',
      })
      // 50 base + 20 probe + 25 explorer + 6 tech = 101 -> capped at 100
      expect(quality).toBe(100)
    })
  })

  describe('Cartography Mission', () => {
    it('should have base quality of 80', () => {
      const quality = calculateScanQuality({
        probeCount: 0,
        explorerCount: 0,
        cartographerEquipped: false,
        explorationTechLevel: 0,
        missionType: 'cartography',
      })
      expect(quality).toBe(80)
    })

    it('should add cartographer bonus', () => {
      const quality = calculateScanQuality({
        probeCount: 0,
        explorerCount: 0,
        cartographerEquipped: true,
        explorationTechLevel: 0,
        missionType: 'cartography',
      })
      expect(quality).toBe(95) // 80 base + 15 cartographer
    })

    it('should cap at 100', () => {
      const quality = calculateScanQuality({
        probeCount: 10,
        explorerCount: 5,
        cartographerEquipped: true,
        explorationTechLevel: 10,
        missionType: 'cartography',
      })
      expect(quality).toBe(100)
    })
  })

  describe('Satellite Deploy Mission', () => {
    it('should have base quality of 30', () => {
      const quality = calculateScanQuality({
        probeCount: 0,
        explorerCount: 0,
        cartographerEquipped: false,
        explorationTechLevel: 0,
        missionType: 'satellite_deploy',
      })
      expect(quality).toBe(30)
    })
  })
})

// ============================================================================
// MISSION CONFIGURATION TESTS
// ============================================================================

describe('Exploration Mission Configuration', () => {
  it('should have all mission types configured', () => {
    const missionTypes: ExplorationMissionType[] = [
      'quick_scan',
      'deep_scan',
      'cartography',
      'satellite_deploy',
    ]

    for (const type of missionTypes) {
      expect(EXPLORATION_MISSION_CONFIG[type]).toBeDefined()
    }
  })

  describe('Quick Scan', () => {
    const config = EXPLORATION_MISSION_CONFIG.quick_scan

    it('should have 1 hour base duration', () => {
      expect(config.baseDuration).toBe(3600)
    })

    it('should result in detected discovery level', () => {
      expect(config.minDiscoveryLevel).toBe('detected')
    })

    it('should not create data cards', () => {
      expect(config.canCreateDataCard).toBe(false)
    })

    it('should not require cartographer', () => {
      expect(config.requiresCartographer).toBe(false)
    })
  })

  describe('Deep Scan', () => {
    const config = EXPLORATION_MISSION_CONFIG.deep_scan

    it('should have 4 hour base duration', () => {
      expect(config.baseDuration).toBe(14400)
    })

    it('should result in explored discovery level', () => {
      expect(config.minDiscoveryLevel).toBe('explored')
    })

    it('should not create data cards', () => {
      expect(config.canCreateDataCard).toBe(false)
    })
  })

  describe('Cartography', () => {
    const config = EXPLORATION_MISSION_CONFIG.cartography

    it('should have 8 hour base duration', () => {
      expect(config.baseDuration).toBe(28800)
    })

    it('should result in mapped discovery level', () => {
      expect(config.minDiscoveryLevel).toBe('mapped')
    })

    it('should create data cards', () => {
      expect(config.canCreateDataCard).toBe(true)
    })

    it('should require cartographer', () => {
      expect(config.requiresCartographer).toBe(true)
    })
  })

  describe('Satellite Deploy', () => {
    const config = EXPLORATION_MISSION_CONFIG.satellite_deploy

    it('should have 2 hour base duration', () => {
      expect(config.baseDuration).toBe(7200)
    })

    it('should result in scanned discovery level', () => {
      expect(config.minDiscoveryLevel).toBe('scanned')
    })
  })
})

// ============================================================================
// SCAN DURATION CALCULATION TESTS
// ============================================================================

describe('Scan Duration Calculation', () => {
  const calculateScanDuration = (
    missionType: ExplorationMissionType,
    techLevel: number
  ): number => {
    const config = EXPLORATION_MISSION_CONFIG[missionType]
    const techReduction = Math.max(0.7, 1.0 - techLevel * 0.03)
    return Math.floor(config.baseDuration * techReduction)
  }

  it('should return base duration at tech level 0', () => {
    expect(calculateScanDuration('quick_scan', 0)).toBe(3600)
    expect(calculateScanDuration('deep_scan', 0)).toBe(14400)
    expect(calculateScanDuration('cartography', 0)).toBe(28800)
    expect(calculateScanDuration('satellite_deploy', 0)).toBe(7200)
  })

  it('should reduce duration by 3% per tech level', () => {
    // At tech level 5: 15% reduction
    const duration = calculateScanDuration('quick_scan', 5)
    expect(duration).toBe(3060) // 3600 * 0.85
  })

  it('should cap reduction at 30%', () => {
    // At tech level 10+: 30% reduction max
    const duration1 = calculateScanDuration('quick_scan', 10)
    const duration2 = calculateScanDuration('quick_scan', 15)
    expect(duration1).toBe(2520) // 3600 * 0.7
    expect(duration2).toBe(2520) // Still 3600 * 0.7 (capped)
  })
})

// ============================================================================
// SPECIAL FINDINGS TESTS
// ============================================================================

describe('Special Findings', () => {
  it('should have all finding types configured', () => {
    const expectedTypes: SpecialFinding[] = [
      'ancient_ruins',
      'resource_deposit',
      'wormhole_signature',
      'artifact_site',
      'pirate_cache',
      'derelict_ship',
      'anomaly',
    ]

    const configuredTypes = SPECIAL_FINDING_CONFIG.map(c => c.type)
    for (const type of expectedTypes) {
      expect(configuredTypes).toContain(type)
    }
  })

  it('should have minimum quality requirements', () => {
    const ancientRuins = SPECIAL_FINDING_CONFIG.find(c => c.type === 'ancient_ruins')
    expect(ancientRuins?.minQuality).toBe(40)

    const anomaly = SPECIAL_FINDING_CONFIG.find(c => c.type === 'anomaly')
    expect(anomaly?.minQuality).toBe(80)
  })

  describe('Roll Special Findings', () => {
    const rollSpecialFindings = (scanQuality: number): SpecialFinding[] => {
      const findings: SpecialFinding[] = []

      for (const config of SPECIAL_FINDING_CONFIG) {
        if (scanQuality < config.minQuality) continue

        const chance =
          config.baseChance + (scanQuality - config.minQuality) * config.qualityScaling
        // Use deterministic check for testing
        if (chance >= 1) {
          findings.push(config.type)
        }
      }

      return findings
    }

    it('should return empty array for low scan quality', () => {
      const findings = rollSpecialFindings(10)
      expect(findings).toEqual([])
    })

    it('should not find anything below minimum quality', () => {
      // Anomaly requires quality 80
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0)

      const rollWithRandom = (scanQuality: number): SpecialFinding[] => {
        const findings: SpecialFinding[] = []
        for (const config of SPECIAL_FINDING_CONFIG) {
          if (scanQuality < config.minQuality) continue
          const chance = config.baseChance + (scanQuality - config.minQuality) * config.qualityScaling
          if (Math.random() < chance) {
            findings.push(config.type)
          }
        }
        return findings
      }

      const findings70 = rollWithRandom(70)
      expect(findings70).not.toContain('anomaly')

      mockRandom.mockRestore()
    })
  })
})

// ============================================================================
// SCAN QUALITY LIMITS TESTS
// ============================================================================

describe('Scan Quality Limits', () => {
  it('should have correct probe limits', () => {
    expect(SCAN_QUALITY_LIMITS.PROBE_PER_UNIT).toBe(2)
    expect(SCAN_QUALITY_LIMITS.PROBE_MAX).toBe(20)
  })

  it('should have correct explorer limits', () => {
    expect(SCAN_QUALITY_LIMITS.EXPLORER_PER_UNIT).toBe(5)
    expect(SCAN_QUALITY_LIMITS.EXPLORER_MAX).toBe(25)
  })

  it('should have correct cartographer bonus', () => {
    expect(SCAN_QUALITY_LIMITS.CARTOGRAPHER).toBe(15)
  })

  it('should have correct tech bonus', () => {
    expect(SCAN_QUALITY_LIMITS.TECH_PER_LEVEL).toBe(2)
  })

  it('should have max quality of 100', () => {
    expect(SCAN_QUALITY_LIMITS.MAX_QUALITY).toBe(100)
  })
})

// ============================================================================
// SATELLITE STATS TESTS
// ============================================================================

describe('Satellite Stats Calculation', () => {
  const calculateSatelliteStats = (
    techLevel: number,
    scanQuality: number
  ) => {
    return {
      sensorRange: 1 + Math.floor(techLevel / 5),
      scanQualityBonus: Math.floor(scanQuality / 10),
      detectionBonus: 0.05 + techLevel * 0.01,
    }
  }

  it('should have minimum sensor range of 1', () => {
    const stats = calculateSatelliteStats(0, 50)
    expect(stats.sensorRange).toBe(1)
  })

  it('should increase sensor range every 5 tech levels', () => {
    expect(calculateSatelliteStats(0, 50).sensorRange).toBe(1)
    expect(calculateSatelliteStats(5, 50).sensorRange).toBe(2)
    expect(calculateSatelliteStats(10, 50).sensorRange).toBe(3)
    expect(calculateSatelliteStats(15, 50).sensorRange).toBe(4)
  })

  it('should calculate scan quality bonus from quality / 10', () => {
    expect(calculateSatelliteStats(0, 30).scanQualityBonus).toBe(3)
    expect(calculateSatelliteStats(0, 50).scanQualityBonus).toBe(5)
    expect(calculateSatelliteStats(0, 100).scanQualityBonus).toBe(10)
  })

  it('should calculate detection bonus from tech level', () => {
    expect(calculateSatelliteStats(0, 50).detectionBonus).toBeCloseTo(0.05)
    expect(calculateSatelliteStats(5, 50).detectionBonus).toBeCloseTo(0.10)
    expect(calculateSatelliteStats(10, 50).detectionBonus).toBeCloseTo(0.15)
  })
})

// ============================================================================
// MISSION TYPE VALIDATION TESTS
// ============================================================================

describe('Mission Type Validation', () => {
  it('should validate cartography requires cartographer', () => {
    const config = EXPLORATION_MISSION_CONFIG.cartography
    expect(config.requiresCartographer).toBe(true)

    // Other missions should not require cartographer
    expect(EXPLORATION_MISSION_CONFIG.quick_scan.requiresCartographer).toBe(false)
    expect(EXPLORATION_MISSION_CONFIG.deep_scan.requiresCartographer).toBe(false)
    expect(EXPLORATION_MISSION_CONFIG.satellite_deploy.requiresCartographer).toBe(false)
  })

  it('should only allow data card creation from cartography', () => {
    expect(EXPLORATION_MISSION_CONFIG.cartography.canCreateDataCard).toBe(true)
    expect(EXPLORATION_MISSION_CONFIG.quick_scan.canCreateDataCard).toBe(false)
    expect(EXPLORATION_MISSION_CONFIG.deep_scan.canCreateDataCard).toBe(false)
    expect(EXPLORATION_MISSION_CONFIG.satellite_deploy.canCreateDataCard).toBe(false)
  })

  it('should have increasing discovery levels', () => {
    const levelOrder = ['detected', 'scanned', 'explored', 'mapped']

    const quickScanIndex = levelOrder.indexOf(EXPLORATION_MISSION_CONFIG.quick_scan.minDiscoveryLevel)
    const deepScanIndex = levelOrder.indexOf(EXPLORATION_MISSION_CONFIG.deep_scan.minDiscoveryLevel)
    const cartographyIndex = levelOrder.indexOf(EXPLORATION_MISSION_CONFIG.cartography.minDiscoveryLevel)

    expect(quickScanIndex).toBeLessThan(deepScanIndex)
    expect(deepScanIndex).toBeLessThan(cartographyIndex)
  })
})

// ============================================================================
// EDGE CASES TESTS
// ============================================================================

describe('Edge Cases', () => {
  const calculateScanQuality = (params: CalculateScanQualityParams): number => {
    const { probeCount, explorerCount, cartographerEquipped, explorationTechLevel, missionType } = params
    const config = EXPLORATION_MISSION_CONFIG[missionType]
    let quality = config.baseQuality
    quality += Math.min(probeCount * SCAN_QUALITY_LIMITS.PROBE_PER_UNIT, SCAN_QUALITY_LIMITS.PROBE_MAX)
    quality += Math.min(explorerCount * SCAN_QUALITY_LIMITS.EXPLORER_PER_UNIT, SCAN_QUALITY_LIMITS.EXPLORER_MAX)
    if (cartographerEquipped) quality += SCAN_QUALITY_LIMITS.CARTOGRAPHER
    quality += explorationTechLevel * SCAN_QUALITY_LIMITS.TECH_PER_LEVEL
    return Math.min(quality, SCAN_QUALITY_LIMITS.MAX_QUALITY)
  }

  it('should handle zero values gracefully', () => {
    const quality = calculateScanQuality({
      probeCount: 0,
      explorerCount: 0,
      cartographerEquipped: false,
      explorationTechLevel: 0,
      missionType: 'quick_scan',
    })
    expect(quality).toBe(20)
  })

  it('should handle extremely large probe counts', () => {
    const quality = calculateScanQuality({
      probeCount: 1000000,
      explorerCount: 0,
      cartographerEquipped: false,
      explorationTechLevel: 0,
      missionType: 'quick_scan',
    })
    // Should cap at 20 base + 20 max probe = 40
    expect(quality).toBe(40)
  })

  it('should handle extremely large tech levels', () => {
    const quality = calculateScanQuality({
      probeCount: 0,
      explorerCount: 0,
      cartographerEquipped: false,
      explorationTechLevel: 100,
      missionType: 'quick_scan',
    })
    // Should cap at 100 (20 + 200 tech bonus, capped at 100)
    expect(quality).toBe(100)
  })

  it('should handle all bonuses maxed', () => {
    const quality = calculateScanQuality({
      probeCount: 100,
      explorerCount: 100,
      cartographerEquipped: true,
      explorationTechLevel: 50,
      missionType: 'cartography',
    })
    expect(quality).toBe(100) // Capped at maximum
  })
})
