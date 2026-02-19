import type { GameEngine } from '../GameEngine'
import { Position } from '../ecs/components'
import { InterpolationBuffer, ShipPredictor } from '@/lib/colyseus/client-prediction'
import { getPrediction } from './PredictionBridgeSystem'

interface Vec3Snapshot {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  timestamp: number
}

const _interpolationBuffers: Map<number, InterpolationBuffer> = new Map()
const _ownPredictor: ShipPredictor = new ShipPredictor()
let _ownShipEid: number = -1

export function setOwnShipEid(eid: number): void {
  _ownShipEid = eid
}

export function feedInterpolation(eid: number, snapshot: Vec3Snapshot): void {
  let buf = _interpolationBuffers.get(eid)
  if (!buf) {
    buf = new InterpolationBuffer()
    _interpolationBuffers.set(eid, buf)
  }
  buf.push(snapshot)
}

export function feedOwnShipState(
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number }
): void {
  _ownPredictor.updateServerState(position, velocity)
}

export function clientPredictionSystem(engine: GameEngine, dt: number): void {
  const ecs = engine.getECS()

  // Own ship: dead reckoning via ShipPredictor
  if (_ownShipEid >= 0) {
    const predicted = _ownPredictor.predict(dt)
    Position.x[_ownShipEid] = predicted.x
    Position.y[_ownShipEid] = predicted.y
    Position.z[_ownShipEid] = predicted.z
  }

  // Remote entities: interpolation buffer
  const now = Date.now()
  for (const [eid, buf] of _interpolationBuffers) {
    if (eid === _ownShipEid) continue

    const snap = buf.getInterpolated(now)
    if (!snap) continue

    // Verify entity still exists in ECS by checking eid is within bounds
    const sessionIds = ecs.getAllSessionIds()
    let found = false
    for (const sid of sessionIds) {
      if (ecs.getEntity(sid) === eid) {
        found = true
        break
      }
    }
    if (!found) {
      _interpolationBuffers.delete(eid)
      continue
    }

    Position.x[eid] = snap.position.x
    Position.y[eid] = snap.position.y
    Position.z[eid] = snap.position.z

    // Blend with worker prediction if available
    const workerPred = getPrediction(eid)
    if (workerPred) {
      const blend = 0.3  // 30% worker prediction, 70% interpolation
      Position.x[eid] = Position.x[eid] * (1 - blend) + workerPred.px * blend
      Position.y[eid] = Position.y[eid] * (1 - blend) + workerPred.py * blend
      Position.z[eid] = Position.z[eid] * (1 - blend) + workerPred.pz * blend
    }
  }
}
