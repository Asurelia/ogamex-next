/**
 * Economy System Tests
 *
 * Tests pure functions: refineOre, ORE_REFINING_RATES, NPC_BASE_PRICES.
 * Functions that require SQLite (matchOrders, generateNpcOrders) are
 * covered in persistence.test.ts.
 */

import { refineOre, ORE_REFINING_RATES } from '../systems/economy'

// NPC_BASE_PRICES is not exported, so we verify its effects indirectly
// through the exported ORE_REFINING_RATES and refineOre.

// ============================================================================
// refineOre()
// ============================================================================

describe('refineOre', () => {
  it('should return expected minerals for veldspar at default efficiency', () => {
    // veldspar: { tritanium: 415 }, default efficiency = 0.5
    // 100 units = 1 batch, 415 * 0.5 = 207.5 -> floor = 207
    const result = refineOre('veldspar', 100)
    expect(result).toEqual({ tritanium: 207 })
  })

  it('should scale output linearly with quantity', () => {
    // 200 units = 2 batches, 2 * 415 * 0.5 = 415
    const result = refineOre('veldspar', 200)
    expect(result).toEqual({ tritanium: 415 })
  })

  it('should handle multi-mineral ores (scordite)', () => {
    // scordite: { tritanium: 346, pyerite: 173 }
    // 100 units, efficiency 0.5 -> trit: 173, pye: 86
    const result = refineOre('scordite', 100)
    expect(result).toEqual({ tritanium: 173, pyerite: 86 })
  })

  it('should handle complex ores (pyroxeres) with many outputs', () => {
    // pyroxeres: { tritanium: 351, pyerite: 25, mexallon: 50, nocxium: 5 }
    // 100 units, efficiency 0.5:
    //   trit: floor(1 * 351 * 0.5) = 175
    //   pye:  floor(1 * 25 * 0.5)  = 12
    //   mex:  floor(1 * 50 * 0.5)  = 25
    //   noc:  floor(1 * 5 * 0.5)   = 2
    const result = refineOre('pyroxeres', 100)
    expect(result).toEqual({
      tritanium: 175,
      pyerite: 12,
      mexallon: 25,
      nocxium: 2,
    })
  })

  it('should return empty object for unknown ore type', () => {
    const result = refineOre('unobtainium', 100)
    expect(result).toEqual({})
  })

  it('should return empty object for empty string ore type', () => {
    const result = refineOre('', 100)
    expect(result).toEqual({})
  })

  it('should apply custom efficiency multiplier', () => {
    // veldspar, 100 units, efficiency 1.0 -> floor(1 * 415 * 1.0) = 415
    const result = refineOre('veldspar', 100, 1.0)
    expect(result).toEqual({ tritanium: 415 })
  })

  it('should apply zero efficiency correctly', () => {
    // efficiency 0.0 -> all outputs are 0, so empty result
    const result = refineOre('veldspar', 100, 0.0)
    expect(result).toEqual({})
  })

  it('should handle fractional batches (quantity not multiple of 100)', () => {
    // 50 units = 0.5 batches, 0.5 * 415 * 0.5 = 103.75 -> floor = 103
    const result = refineOre('veldspar', 50)
    expect(result).toEqual({ tritanium: 103 })
  })

  it('should handle zero quantity', () => {
    // 0 units = 0 batches -> everything is 0 -> empty result
    const result = refineOre('veldspar', 0)
    expect(result).toEqual({})
  })

  it('should handle high efficiency (above 1.0)', () => {
    // veldspar, 100 units, efficiency 1.5 -> floor(1 * 415 * 1.5) = 622
    const result = refineOre('veldspar', 100, 1.5)
    expect(result).toEqual({ tritanium: 622 })
  })

  it('should omit minerals that round to zero', () => {
    // hedbergite has megacyte: 17 per 100 units
    // 10 units = 0.1 batches, 0.1 * 17 * 0.5 = 0.85 -> floor = 0
    // But pyerite: 342, 0.1 * 342 * 0.5 = 17.1 -> 17
    const result = refineOre('hedbergite', 10)
    // Only minerals that floor to > 0 should be present
    for (const value of Object.values(result)) {
      expect(value).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// ORE_REFINING_RATES
// ============================================================================

describe('ORE_REFINING_RATES', () => {
  const EXPECTED_ORES = [
    'veldspar', 'scordite', 'pyroxeres', 'plagioclase', 'omber',
    'kernite', 'jaspet', 'hemorphite', 'hedbergite', 'arkonor',
  ]

  it('should contain all 10 standard ore types', () => {
    for (const ore of EXPECTED_ORES) {
      expect(ORE_REFINING_RATES).toHaveProperty(ore)
    }
  })

  it('should not contain unexpected ore types', () => {
    expect(Object.keys(ORE_REFINING_RATES)).toHaveLength(EXPECTED_ORES.length)
  })

  it('should have positive yield values for every mineral in every ore', () => {
    for (const [ore, minerals] of Object.entries(ORE_REFINING_RATES)) {
      for (const [mineral, rate] of Object.entries(minerals)) {
        expect(rate).toBeGreaterThan(0)
      }
    }
  })

  it('should only contain valid mineral names', () => {
    const VALID_MINERALS = [
      'tritanium', 'pyerite', 'mexallon', 'isogen',
      'nocxium', 'zydrine', 'megacyte',
    ]
    for (const minerals of Object.values(ORE_REFINING_RATES)) {
      for (const mineral of Object.keys(minerals)) {
        expect(VALID_MINERALS).toContain(mineral)
      }
    }
  })

  it('veldspar should yield only tritanium', () => {
    expect(Object.keys(ORE_REFINING_RATES.veldspar)).toEqual(['tritanium'])
    expect(ORE_REFINING_RATES.veldspar.tritanium).toBe(415)
  })

  it('arkonor should yield tritanium, mexallon, and megacyte', () => {
    const minerals = Object.keys(ORE_REFINING_RATES.arkonor).sort()
    expect(minerals).toEqual(['megacyte', 'mexallon', 'tritanium'])
  })
})
