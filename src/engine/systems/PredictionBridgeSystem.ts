/**
 * PredictionBridgeSystem
 * Sends entity positions/velocities to prediction worker,
 * applies predicted positions to remote entities.
 */
import type { GameEngine } from '../GameEngine'
import { Position, Velocity, ShipMeta, NetworkId } from '../ecs/components'
import { query } from 'bitecs'

let _worker: Worker | null = null
let _pendingResults: Map<number, { px: number; py: number; pz: number }> = new Map()
let _tickCounter = 0
const SEND_INTERVAL = 3  // Send to worker every 3 ticks (~20Hz at 60Hz loop)

function initWorker(): Worker {
  const worker = new Worker(
    new URL('../../workers/prediction.worker.ts', import.meta.url),
    { type: 'module' }
  )
  worker.onmessage = (event) => {
    if (event.data.type === 'predicted') {
      _pendingResults.clear()
      for (const r of event.data.results) {
        _pendingResults.set(r.eid, r)
      }
    }
  }
  return worker
}

/** Get predicted position for an entity, if available */
export function getPrediction(eid: number): { px: number; py: number; pz: number } | null {
  return _pendingResults.get(eid) ?? null
}

export function predictionBridgeSystem(engine: GameEngine, dt: number): void {
  if (!_worker) {
    try {
      _worker = initWorker()
    } catch {
      return  // Workers may not be available (SSR, etc.)
    }
  }

  _tickCounter++
  if (_tickCounter < SEND_INTERVAL) return
  _tickCounter = 0

  const world = engine.getWorld()
  if (!world) return

  const entities = query(world, [Position, Velocity, ShipMeta, NetworkId])
  const payload: Array<{ eid: number; x: number; y: number; z: number; vx: number; vy: number; vz: number }> = []

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]
    // Only predict remote entities (non-own, non-docked)
    if (ShipMeta.isDocked[eid] === 1) continue
    payload.push({
      eid,
      x: Position.x[eid],
      y: Position.y[eid],
      z: Position.z[eid],
      vx: Velocity.x[eid],
      vy: Velocity.y[eid],
      vz: Velocity.z[eid],
    })
  }

  if (payload.length > 0) {
    _worker.postMessage({ type: 'predict', entities: payload, dt })
  }
}

export function destroyPredictionWorker(): void {
  if (_worker) {
    _worker.terminate()
    _worker = null
  }
  _pendingResults.clear()
}
