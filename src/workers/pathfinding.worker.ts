/**
 * Pathfinding WebWorker
 *
 * Offloads A* route calculation to a background thread so the main
 * thread / rendering loop is not blocked by large graph searches.
 *
 * Messages:
 *   IN:  PathfindingRequest  { type: 'find_route', graph, startId, endId, avoidLowSec }
 *   OUT: PathfindingResponse { type: 'route_found', route: string[] }
 */

// ============================================================================
// MESSAGE TYPES
// ============================================================================

interface PathfindingRequest {
  type: 'find_route'
  graph: { systems: Record<string, { connections: string[]; securityLevel: number }> }
  startId: string
  endId: string
  avoidLowSec: boolean
}

interface PathfindingResponse {
  type: 'route_found'
  route: string[]
}

// ============================================================================
// A* IMPLEMENTATION (duplicated from server for worker isolation)
// ============================================================================

interface SystemNode {
  connections: string[]
  securityLevel: number
}

function findRoute(
  systems: Map<string, SystemNode>,
  startId: string,
  endId: string,
  avoidLowSec: boolean
): string[] {
  if (startId === endId) return [startId]

  if (!systems.has(startId) || !systems.has(endId)) return []

  const openSet = new Set<string>([startId])
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>()
  const fScore = new Map<string, number>()

  gScore.set(startId, 0)
  fScore.set(startId, 0)

  while (openSet.size > 0) {
    // Find node with lowest fScore
    let current: string | null = null
    let bestScore = Infinity

    for (const id of openSet) {
      const score = fScore.get(id) ?? Infinity
      if (score < bestScore) {
        bestScore = score
        current = id
      }
    }

    if (!current) break

    if (current === endId) {
      // Reconstruct path
      const path: string[] = [current]
      let node = current
      while (cameFrom.has(node)) {
        node = cameFrom.get(node)!
        path.unshift(node)
      }
      return path
    }

    openSet.delete(current)

    const currentNode = systems.get(current)
    if (!currentNode) continue

    for (const neighborId of currentNode.connections) {
      const neighborNode = systems.get(neighborId)
      if (!neighborNode) continue

      // Edge cost: base 1 + penalty for low-sec if avoidLowSec
      let edgeCost = 1
      if (avoidLowSec && neighborNode.securityLevel < 0.5) {
        edgeCost += 50
      }

      const tentativeG = (gScore.get(current) ?? Infinity) + edgeCost

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, current)
        gScore.set(neighborId, tentativeG)
        fScore.set(neighborId, tentativeG)

        if (!openSet.has(neighborId)) {
          openSet.add(neighborId)
        }
      }
    }
  }

  return []
}

// ============================================================================
// WORKER MESSAGE HANDLER
// ============================================================================

self.onmessage = (event: MessageEvent<PathfindingRequest>) => {
  const { type, graph, startId, endId, avoidLowSec } = event.data

  if (type !== 'find_route') return

  // Convert plain object graph to Map
  const systems = new Map<string, SystemNode>()
  for (const [id, data] of Object.entries(graph.systems)) {
    systems.set(id, {
      connections: data.connections,
      securityLevel: data.securityLevel,
    })
  }

  const route = findRoute(systems, startId, endId, avoidLowSec)

  const response: PathfindingResponse = {
    type: 'route_found',
    route,
  }

  self.postMessage(response)
}

// Export types for consumers
export type { PathfindingRequest, PathfindingResponse }
