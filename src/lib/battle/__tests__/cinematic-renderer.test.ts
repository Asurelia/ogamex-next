/**
 * Cinematic Renderer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  CinematicRenderer,
  DEFAULT_RENDERER_CONFIG,
  createBattleTimeline,
  type TimelineEvent,
  type BattleTimeline,
  type Position3D,
  type AttackEvent,
  type DamageEvent,
  type DestructionEvent,
} from '../cinematic-renderer'

// ============================================================================
// TEST HELPERS
// ============================================================================

const createTestPosition = (x: number = 0, y: number = 0, z: number = 0): Position3D => ({
  x, y, z,
})

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('DEFAULT_RENDERER_CONFIG', () => {
  it('should have all base durations defined', () => {
    expect(DEFAULT_RENDERER_CONFIG.baseDurations.battleStart).toBeGreaterThan(0)
    expect(DEFAULT_RENDERER_CONFIG.baseDurations.roundTransition).toBeGreaterThan(0)
    expect(DEFAULT_RENDERER_CONFIG.baseDurations.attack).toBeGreaterThan(0)
    expect(DEFAULT_RENDERER_CONFIG.baseDurations.damage).toBeGreaterThan(0)
    expect(DEFAULT_RENDERER_CONFIG.baseDurations.destruction).toBeGreaterThan(0)
    expect(DEFAULT_RENDERER_CONFIG.baseDurations.boarding).toBeGreaterThan(0)
    expect(DEFAULT_RENDERER_CONFIG.baseDurations.ability).toBeGreaterThan(0)
    expect(DEFAULT_RENDERER_CONFIG.baseDurations.battleEnd).toBeGreaterThan(0)
  })

  it('should have pacing multipliers', () => {
    expect(DEFAULT_RENDERER_CONFIG.pacing.normal).toBe(1.0)
    expect(DEFAULT_RENDERER_CONFIG.pacing.fast).toBeLessThan(1.0)
    expect(DEFAULT_RENDERER_CONFIG.pacing.dramatic).toBeGreaterThan(1.0)
  })

  it('should enable features by default', () => {
    expect(DEFAULT_RENDERER_CONFIG.enableSound).toBe(true)
    expect(DEFAULT_RENDERER_CONFIG.enableCameraMovements).toBe(true)
  })
})

// ============================================================================
// CINEMATIC RENDERER TESTS
// ============================================================================

describe('CinematicRenderer', () => {
  let renderer: CinematicRenderer

  beforeEach(() => {
    renderer = new CinematicRenderer()
  })

  describe('constructor', () => {
    it('should use default config', () => {
      const r = new CinematicRenderer()
      expect(r).toBeDefined()
    })

    it('should merge custom config', () => {
      const r = new CinematicRenderer({
        enableSound: false,
        quality: 'low',
      })
      expect(r).toBeDefined()
    })
  })

  describe('calculateUnitPosition', () => {
    it('should position attackers on negative X', () => {
      const pos = renderer.calculateUnitPosition(0, 10, 'attacker', 'center')
      expect(pos.x).toBeLessThan(0)
    })

    it('should position defenders on positive X', () => {
      const pos = renderer.calculateUnitPosition(0, 10, 'defender', 'center')
      expect(pos.x).toBeGreaterThan(0)
    })

    it('should offset vanguard units forward', () => {
      const vanguard = renderer.calculateUnitPosition(0, 10, 'attacker', 'vanguard')
      const center = renderer.calculateUnitPosition(0, 10, 'attacker', 'center')
      // Vanguard should be closer to enemy (higher Z for attacker)
      expect(vanguard.z).toBeGreaterThan(center.z - 200)
    })

    it('should offset rear units backward', () => {
      const rear = renderer.calculateUnitPosition(0, 10, 'attacker', 'rear')
      const center = renderer.calculateUnitPosition(0, 10, 'attacker', 'center')
      // Rear should be further from enemy (lower Z for attacker)
      expect(rear.z).toBeLessThan(center.z + 200)
    })
  })

  describe('getWeaponVisualType', () => {
    it('should map damage types to visual types', () => {
      expect(renderer.getWeaponVisualType('ballistic')).toBe('railgun')
      expect(renderer.getWeaponVisualType('ionic')).toBe('ion')
      expect(renderer.getWeaponVisualType('explosive')).toBe('missile')
      expect(renderer.getWeaponVisualType('hacking')).toBe('pulse')
      expect(renderer.getWeaponVisualType('boarding')).toBe('torpedo')
    })
  })

  describe('getExplosionSize', () => {
    it('should return small for fighters', () => {
      expect(renderer.getExplosionSize('fighter')).toBe('small')
      expect(renderer.getExplosionSize('corvette')).toBe('small')
    })

    it('should return medium for cruisers', () => {
      expect(renderer.getExplosionSize('frigate')).toBe('medium')
      expect(renderer.getExplosionSize('cruiser')).toBe('medium')
    })

    it('should return large for capital ships', () => {
      expect(renderer.getExplosionSize('battlecruiser')).toBe('large')
      expect(renderer.getExplosionSize('battleship')).toBe('large')
    })

    it('should return massive for dreadnoughts', () => {
      expect(renderer.getExplosionSize('dreadnought')).toBe('massive')
      expect(renderer.getExplosionSize('carrier')).toBe('massive')
    })
  })

  describe('createBattleStartEvents', () => {
    it('should create battle start events', () => {
      const events = renderer.createBattleStartEvents(50, 30, 'arrow', 'defensive_sphere', 'Alpha Sector')

      expect(events.length).toBeGreaterThan(0)

      const battleStart = events.find(e => e.type === 'battle_start')
      expect(battleStart).toBeDefined()
      expect((battleStart as any).data.attackerFleetSize).toBe(50)
      expect((battleStart as any).data.defenderFleetSize).toBe(30)
    })

    it('should include camera movement', () => {
      const events = renderer.createBattleStartEvents(50, 30)

      const cameraMove = events.find(e => e.type === 'camera_move')
      expect(cameraMove).toBeDefined()
    })

    it('should include warp in effects', () => {
      const events = renderer.createBattleStartEvents(50, 30)

      const warpEffects = events.filter(e => e.type === 'effect' && (e as any).data.effectType === 'warp_in')
      expect(warpEffects.length).toBe(2) // One for each side
    })

    it('should include announcement text', () => {
      const events = renderer.createBattleStartEvents(50, 30)

      const textEvent = events.find(e => e.type === 'text_display')
      expect(textEvent).toBeDefined()
      expect((textEvent as any).data.text).toBe('BATTLE ENGAGED')
    })

    it('should include sound', () => {
      const events = renderer.createBattleStartEvents(50, 30)

      const soundEvent = events.find(e => e.type === 'sound')
      expect(soundEvent).toBeDefined()
    })
  })

  describe('createRoundEvents', () => {
    it('should create round start events', () => {
      const events = renderer.createRoundEvents(1, 45, 28, true)

      const roundStart = events.find(e => e.type === 'round_start')
      expect(roundStart).toBeDefined()
      expect((roundStart as any).data.roundNumber).toBe(1)
    })

    it('should create round end events', () => {
      const events = renderer.createRoundEvents(1, 40, 20, false)

      const roundEnd = events.find(e => e.type === 'round_end')
      expect(roundEnd).toBeDefined()
    })

    it('should include round announcement for start', () => {
      const events = renderer.createRoundEvents(3, 40, 20, true)

      const textEvent = events.find(e => e.type === 'text_display')
      expect(textEvent).toBeDefined()
      expect((textEvent as any).data.text).toBe('ROUND 3')
    })
  })

  describe('createAttackEvent', () => {
    const attacker = {
      id: 'att_1',
      name: 'Cruiser Alpha',
      class: 'cruiser',
      position: createTestPosition(-100, 0, 0),
    }

    const target = {
      id: 'def_1',
      name: 'Fighter Beta',
      class: 'fighter',
      position: createTestPosition(100, 0, 0),
    }

    it('should create attack event', () => {
      const events = renderer.createAttackEvent(attacker, target, 'ballistic', false)

      const attackEvent = events.find(e => e.type === 'attack') as AttackEvent
      expect(attackEvent).toBeDefined()
      expect(attackEvent.data.attackerId).toBe('att_1')
      expect(attackEvent.data.targetId).toBe('def_1')
      expect(attackEvent.data.damageType).toBe('ballistic')
    })

    it('should create weapon effect', () => {
      const events = renderer.createAttackEvent(attacker, target, 'ionic', false)

      const effectEvent = events.find(e => e.type === 'effect')
      expect(effectEvent).toBeDefined()
      expect((effectEvent as any).data.effectType).toBe('ion_beam')
    })

    it('should enhance critical hits', () => {
      const normalEvents = renderer.createAttackEvent(attacker, target, 'ballistic', false)
      renderer.reset()
      const critEvents = renderer.createAttackEvent(attacker, target, 'ballistic', true)

      // Critical should have camera movement
      const critCamera = critEvents.find(e => e.type === 'camera_move')
      expect(critCamera).toBeDefined()

      // Critical effect should be larger
      const normalEffect = normalEvents.find(e => e.type === 'effect')
      const critEffect = critEvents.find(e => e.type === 'effect')
      expect((critEffect as any).data.scale).toBeGreaterThan((normalEffect as any).data.scale)
    })

    it('should include sound', () => {
      const events = renderer.createAttackEvent(attacker, target, 'explosive', false)

      const soundEvent = events.find(e => e.type === 'sound')
      expect(soundEvent).toBeDefined()
      expect((soundEvent as any).data.category).toBe('weapon_fire')
    })
  })

  describe('createDamageEvent', () => {
    const target = {
      id: 'def_1',
      name: 'Cruiser Beta',
      position: createTestPosition(100, 0, 0),
    }

    it('should create damage event', () => {
      const events = renderer.createDamageEvent(
        target,
        { ballistic: 100, ionic: 50 },
        150, // total
        80,  // shield
        50,  // armor
        20,  // hull
        false, // critical
        false, // shield broken
        70    // remaining hull %
      )

      const damageEvent = events.find(e => e.type === 'damage') as DamageEvent
      expect(damageEvent).toBeDefined()
      expect(damageEvent.data.totalDamage).toBe(150)
      expect(damageEvent.data.shieldDamage).toBe(80)
    })

    it('should create shield hit effect', () => {
      const events = renderer.createDamageEvent(
        target, { ballistic: 50 }, 50, 50, 0, 0, false, false, 100
      )

      const shieldEffect = events.find(
        e => e.type === 'effect' && (e as any).data.effectType === 'shield_hit'
      )
      expect(shieldEffect).toBeDefined()
    })

    it('should create shield break effect', () => {
      const events = renderer.createDamageEvent(
        target, { ballistic: 100 }, 100, 100, 0, 0, false, true, 100
      )

      const shieldBreak = events.find(
        e => e.type === 'effect' && (e as any).data.effectType === 'shield_break'
      )
      expect(shieldBreak).toBeDefined()
    })

    it('should create armor and hull effects', () => {
      const events = renderer.createDamageEvent(
        target, { explosive: 100 }, 100, 0, 50, 50, false, false, 50
      )

      const armorEffect = events.find(
        e => e.type === 'effect' && (e as any).data.effectType === 'armor_spark'
      )
      const hullEffect = events.find(
        e => e.type === 'effect' && (e as any).data.effectType === 'hull_breach'
      )
      expect(armorEffect).toBeDefined()
      expect(hullEffect).toBeDefined()
    })

    it('should enhance critical damage', () => {
      const events = renderer.createDamageEvent(
        target, { ballistic: 200 }, 200, 50, 50, 100, true, false, 20
      )

      const critEffect = events.find(
        e => e.type === 'effect' && (e as any).data.effectType === 'critical_hit'
      )
      expect(critEffect).toBeDefined()

      const critText = events.find(
        e => e.type === 'text_display' && (e as any).data.text === 'CRITICAL!'
      )
      expect(critText).toBeDefined()
    })

    it('should show damage numbers', () => {
      const events = renderer.createDamageEvent(
        target, { ballistic: 75 }, 75, 75, 0, 0, false, false, 100
      )

      const damageNumber = events.find(
        e => e.type === 'text_display' && (e as any).data.style === 'damage_number'
      )
      expect(damageNumber).toBeDefined()
      expect((damageNumber as any).data.text).toBe('-75')
    })
  })

  describe('createDestructionEvent', () => {
    it('should create destruction event', () => {
      const events = renderer.createDestructionEvent(
        { id: 'unit_1', name: 'Fighter Alpha', class: 'fighter', position: createTestPosition() },
        'Cruiser Beta',
        'veteran'
      )

      const destruction = events.find(e => e.type === 'destruction') as DestructionEvent
      expect(destruction).toBeDefined()
      expect(destruction.data.unitName).toBe('Fighter Alpha')
      expect(destruction.data.killerName).toBe('Cruiser Beta')
      expect(destruction.data.explosionSize).toBe('small')
    })

    it('should scale explosion by ship class', () => {
      const fighterEvents = renderer.createDestructionEvent(
        { id: 'f1', name: 'Fighter', class: 'fighter', position: createTestPosition() }
      )
      renderer.reset()
      const dreadnoughtEvents = renderer.createDestructionEvent(
        { id: 'd1', name: 'Dreadnought', class: 'dreadnought', position: createTestPosition() }
      )

      const fighterExplosion = fighterEvents.find(e => e.type === 'destruction') as DestructionEvent
      const dreadExplosion = dreadnoughtEvents.find(e => e.type === 'destruction') as DestructionEvent

      expect(fighterExplosion.data.explosionSize).toBe('small')
      expect(dreadExplosion.data.explosionSize).toBe('massive')
    })

    it('should include explosion effects', () => {
      const events = renderer.createDestructionEvent(
        { id: 'c1', name: 'Cruiser', class: 'cruiser', position: createTestPosition() }
      )

      const explosionEffect = events.find(
        e => e.type === 'effect' && (e as any).data.effectType.startsWith('explosion_')
      )
      expect(explosionEffect).toBeDefined()
    })

    it('should add camera for large explosions', () => {
      const events = renderer.createDestructionEvent(
        { id: 'bs1', name: 'Battleship', class: 'battleship', position: createTestPosition() }
      )

      const cameraMove = events.find(e => e.type === 'camera_move')
      expect(cameraMove).toBeDefined()
    })

    it('should include destruction text', () => {
      const events = renderer.createDestructionEvent(
        { id: 'f1', name: 'Fighter X', class: 'fighter', position: createTestPosition() }
      )

      const textEvent = events.find(e => e.type === 'text_display')
      expect(textEvent).toBeDefined()
      expect((textEvent as any).data.text).toBe('Fighter X DESTROYED')
    })
  })

  describe('createBattleEndEvents', () => {
    it('should create battle end event', () => {
      const events = renderer.createBattleEndEvents(
        'attacker', 25, 0, 5,
        { metal: 100000, crystal: 50000 },
        8, false
      )

      const battleEnd = events.find(e => e.type === 'battle_end')
      expect(battleEnd).toBeDefined()
      expect((battleEnd as any).data.winner).toBe('attacker')
      expect((battleEnd as any).data.attackerSurvivors).toBe(25)
    })

    it('should show victory announcement for attacker', () => {
      const events = renderer.createBattleEndEvents(
        'attacker', 25, 0, 5, { metal: 0, crystal: 0 }, 0, false
      )

      const textEvent = events.find(e => e.type === 'text_display')
      expect((textEvent as any).data.text).toBe('ATTACKER VICTORY')
    })

    it('should show victory announcement for defender', () => {
      const events = renderer.createBattleEndEvents(
        'defender', 0, 30, 4, { metal: 0, crystal: 0 }, 0, false
      )

      const textEvent = events.find(e => e.type === 'text_display')
      expect((textEvent as any).data.text).toBe('DEFENDER VICTORY')
    })

    it('should show draw announcement', () => {
      const events = renderer.createBattleEndEvents(
        'draw', 0, 0, 6, { metal: 0, crystal: 0 }, 0, false
      )

      const textEvent = events.find(e => e.type === 'text_display')
      expect((textEvent as any).data.text).toBe('BATTLE DRAW')
    })
  })

  describe('createTimeline', () => {
    it('should create complete timeline', () => {
      const events = renderer.createBattleStartEvents(50, 30)

      const timeline = renderer.createTimeline(
        {
          battleId: 'battle_001',
          attackerName: 'Player 1',
          defenderName: 'Player 2',
          totalRounds: 5,
          winner: 'attacker',
        },
        events
      )

      expect(timeline.events.length).toBe(events.length)
      expect(timeline.metadata.battleId).toBe('battle_001')
      expect(timeline.metadata.createdAt).toBeDefined()
      expect(timeline.playback.currentTime).toBe(0)
      expect(timeline.playback.isPlaying).toBe(false)
    })

    it('should sort events by start time and priority', () => {
      const event1: TimelineEvent = {
        id: '1',
        type: 'effect',
        startTime: 100,
        duration: 100,
        priority: 50,
        blocking: false,
        data: {},
      } as any

      const event2: TimelineEvent = {
        id: '2',
        type: 'effect',
        startTime: 100,
        duration: 100,
        priority: 80,
        blocking: false,
        data: {},
      } as any

      const event3: TimelineEvent = {
        id: '3',
        type: 'effect',
        startTime: 50,
        duration: 100,
        priority: 60,
        blocking: false,
        data: {},
      } as any

      const timeline = renderer.createTimeline(
        { battleId: 'test', attackerName: 'A', defenderName: 'B', totalRounds: 1, winner: 'draw' },
        [event1, event2, event3]
      )

      // Event3 should be first (earliest start time)
      expect(timeline.events[0].id).toBe('3')
      // Event2 should be second (same start time, higher priority)
      expect(timeline.events[1].id).toBe('2')
      // Event1 should be last
      expect(timeline.events[2].id).toBe('1')
    })
  })

  describe('reset', () => {
    it('should reset renderer state', () => {
      renderer.createBattleStartEvents(50, 30)
      const initialEvents = renderer.createAttackEvent(
        { id: '1', name: 'A', class: 'cruiser', position: createTestPosition(-100, 0, 0) },
        { id: '2', name: 'B', class: 'fighter', position: createTestPosition(100, 0, 0) },
        'ballistic',
        false
      )

      renderer.reset()

      const afterResetEvents = renderer.createAttackEvent(
        { id: '1', name: 'A', class: 'cruiser', position: createTestPosition(-100, 0, 0) },
        { id: '2', name: 'B', class: 'fighter', position: createTestPosition(100, 0, 0) },
        'ballistic',
        false
      )

      // Start times should reset
      expect(afterResetEvents[0].startTime).toBeLessThan(initialEvents[0].startTime)
    })
  })

  describe('static methods', () => {
    it('getEventsAtTime should return active events', () => {
      const timeline: BattleTimeline = {
        totalDuration: 1000,
        events: [
          { id: '1', type: 'effect', startTime: 0, duration: 500, priority: 1, blocking: false, data: {} } as any,
          { id: '2', type: 'effect', startTime: 200, duration: 300, priority: 1, blocking: false, data: {} } as any,
          { id: '3', type: 'effect', startTime: 600, duration: 200, priority: 1, blocking: false, data: {} } as any,
        ],
        metadata: {} as any,
        playback: {} as any,
      }

      const at0 = CinematicRenderer.getEventsAtTime(timeline, 0)
      expect(at0.length).toBe(1)
      expect(at0[0].id).toBe('1')

      const at300 = CinematicRenderer.getEventsAtTime(timeline, 300)
      expect(at300.length).toBe(2)

      const at700 = CinematicRenderer.getEventsAtTime(timeline, 700)
      expect(at700.length).toBe(1)
      expect(at700[0].id).toBe('3')
    })

    it('getNextEvent should return next upcoming event', () => {
      const timeline: BattleTimeline = {
        totalDuration: 1000,
        events: [
          { id: '1', type: 'effect', startTime: 100, duration: 100, priority: 1, blocking: false, data: {} } as any,
          { id: '2', type: 'effect', startTime: 300, duration: 100, priority: 1, blocking: false, data: {} } as any,
        ],
        metadata: {} as any,
        playback: {} as any,
      }

      const next = CinematicRenderer.getNextEvent(timeline, 50)
      expect(next?.id).toBe('1')

      const next2 = CinematicRenderer.getNextEvent(timeline, 150)
      expect(next2?.id).toBe('2')

      const next3 = CinematicRenderer.getNextEvent(timeline, 400)
      expect(next3).toBeNull()
    })

    it('seekTo should update playback state', () => {
      const timeline: BattleTimeline = {
        totalDuration: 1000,
        events: [
          { id: '1', type: 'effect', startTime: 100, duration: 100, priority: 1, blocking: false, data: {} } as any,
          { id: '2', type: 'effect', startTime: 300, duration: 100, priority: 1, blocking: false, data: {} } as any,
          { id: '3', type: 'effect', startTime: 500, duration: 100, priority: 1, blocking: false, data: {} } as any,
        ],
        metadata: {} as any,
        playback: { currentTime: 0, isPlaying: false, playbackSpeed: 1, currentEventIndex: 0 },
      }

      CinematicRenderer.seekTo(timeline, 350)
      expect(timeline.playback.currentTime).toBe(350)
      expect(timeline.playback.currentEventIndex).toBe(1) // Event 2 is at 300

      CinematicRenderer.seekTo(timeline, 1500) // Beyond duration
      expect(timeline.playback.currentTime).toBe(1000)

      CinematicRenderer.seekTo(timeline, -100) // Before start
      expect(timeline.playback.currentTime).toBe(0)
    })
  })
})

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('createBattleTimeline', () => {
  it('should create timeline builder', () => {
    const { renderer, addEvent, build } = createBattleTimeline(
      'battle_123',
      'Attacker',
      'Defender'
    )

    expect(renderer).toBeInstanceOf(CinematicRenderer)

    const events = renderer.createBattleStartEvents(10, 10)
    events.forEach(addEvent)

    const timeline = build()
    expect(timeline.metadata.battleId).toBe('battle_123')
    expect(timeline.metadata.attackerName).toBe('Attacker')
    expect(timeline.events.length).toBeGreaterThan(0)
  })
})
