/**
 * Prediction WebWorker
 * Phase 1: Linear dead reckoning (position + velocity * dt)
 * Phase 2 (future): ONNX runtime for ML-based prediction
 */

interface PredictionEntity {
  eid: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

interface PredictionRequest {
  type: 'predict'
  entities: PredictionEntity[]
  dt: number
}

interface PredictionResponse {
  type: 'predicted'
  results: Array<{ eid: number; px: number; py: number; pz: number }>
}

// Store previous positions for velocity smoothing
const prevPositions: Map<number, { x: number; y: number; z: number; t: number }> = new Map()

function predict(entities: PredictionEntity[], dt: number): PredictionResponse['results'] {
  const results: PredictionResponse['results'] = []

  for (const e of entities) {
    // Phase 1: Simple dead reckoning with velocity smoothing
    const prev = prevPositions.get(e.eid)

    let smoothVx = e.vx
    let smoothVy = e.vy
    let smoothVz = e.vz

    if (prev) {
      // Blend server velocity with observed velocity
      const observedVx = (e.x - prev.x) / Math.max(dt, 0.001)
      const observedVy = (e.y - prev.y) / Math.max(dt, 0.001)
      const observedVz = (e.z - prev.z) / Math.max(dt, 0.001)

      const blend = 0.7  // 70% server velocity, 30% observed
      smoothVx = e.vx * blend + observedVx * (1 - blend)
      smoothVy = e.vy * blend + observedVy * (1 - blend)
      smoothVz = e.vz * blend + observedVz * (1 - blend)
    }

    prevPositions.set(e.eid, { x: e.x, y: e.y, z: e.z, t: Date.now() })

    results.push({
      eid: e.eid,
      px: e.x + smoothVx * dt,
      py: e.y + smoothVy * dt,
      pz: e.z + smoothVz * dt,
    })
  }

  // Cleanup stale entries
  if (prevPositions.size > 1000) {
    const now = Date.now()
    for (const [eid, data] of prevPositions) {
      if (now - data.t > 10000) prevPositions.delete(eid)
    }
  }

  return results
}

self.onmessage = (event: MessageEvent<PredictionRequest>) => {
  const { type, entities, dt } = event.data
  if (type !== 'predict') return

  const results = predict(entities, dt)
  const response: PredictionResponse = { type: 'predicted', results }
  self.postMessage(response)
}

export type { PredictionRequest, PredictionResponse, PredictionEntity }
