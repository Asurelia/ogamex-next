/**
 * A* Pathfinding System
 *
 * Inter-system route calculation on the solar system connection graph.
 * Supports security-aware routing (avoid low-sec option).
 * Used by NPC autopilot and client starmap route display.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SystemNode {
  connections: string[]
  securityLevel: number
}

export interface PathfindingGraph {
  systems: Map<string, SystemNode>
}

// ============================================================================
// A* PATHFINDING
// ============================================================================

/**
 * Find the shortest route between two systems using A*.
 * When avoidLowSec is true, low-sec systems receive a heavy weight penalty
 * making the algorithm prefer safer high-sec routes.
 *
 * @returns Ordered list of system IDs from start to end (inclusive), or empty array if no route found
 */
export function findRoute(
  graph: PathfindingGraph,
  startId: string,
  endId: string,
  avoidLowSec: boolean
): string[] {
  if (startId === endId) return [startId]

  const startNode = graph.systems.get(startId)
  const endNode = graph.systems.get(endId)
  if (!startNode || !endNode) return []

  // Open set: systems to evaluate, keyed by system ID
  const openSet = new Set<string>([startId])

  // Came-from map for path reconstruction
  const cameFrom = new Map<string, string>()

  // g(n): cost from start to n
  const gScore = new Map<string, number>()
  gScore.set(startId, 0)

  // f(n) = g(n) + h(n): estimated total cost through n
  const fScore = new Map<string, number>()
  fScore.set(startId, 0)

  while (openSet.size > 0) {
    // Pick the node in openSet with the lowest fScore
    const current = getLowestFScore(openSet, fScore)
    if (!current) break

    if (current === endId) {
      return reconstructPath(cameFrom, current)
    }

    openSet.delete(current)

    const currentNode = graph.systems.get(current)
    if (!currentNode) continue

    for (const neighborId of currentNode.connections) {
      const neighborNode = graph.systems.get(neighborId)
      if (!neighborNode) continue

      // Calculate edge cost with security weighting
      const edgeCost = getEdgeCost(neighborNode.securityLevel, avoidLowSec)
      const tentativeG = (gScore.get(current) ?? Infinity) + edgeCost

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, current)
        gScore.set(neighborId, tentativeG)
        // Heuristic: 0 (Dijkstra-style) since we have no spatial coordinates
        // for systems in this graph. This degrades A* to Dijkstra but remains correct.
        fScore.set(neighborId, tentativeG)

        if (!openSet.has(neighborId)) {
          openSet.add(neighborId)
        }
      }
    }
  }

  // No route found
  return []
}

// ============================================================================
// GRAPH CONSTRUCTION
// ============================================================================

/**
 * Build a PathfindingGraph from a plain object (e.g. JSON from Supabase or worker message).
 */
export function buildGraph(
  systemsData: Record<string, { connections: string[]; securityLevel: number }>
): PathfindingGraph {
  const systems = new Map<string, SystemNode>()

  for (const [id, data] of Object.entries(systemsData)) {
    systems.set(id, {
      connections: data.connections,
      securityLevel: data.securityLevel,
    })
  }

  return { systems }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate the traversal cost to enter a system.
 * Base cost is 1 jump. Low-sec systems get a penalty of +50 when avoidLowSec is enabled,
 * making the algorithm strongly prefer high-sec routes.
 */
function getEdgeCost(securityLevel: number, avoidLowSec: boolean): number {
  const baseCost = 1

  if (avoidLowSec && securityLevel < 0.5) {
    // Heavy penalty for low-sec and null-sec
    return baseCost + 50
  }

  return baseCost
}

/**
 * Find the node with the lowest fScore in the open set.
 */
function getLowestFScore(openSet: Set<string>, fScore: Map<string, number>): string | null {
  let best: string | null = null
  let bestScore = Infinity

  for (const id of openSet) {
    const score = fScore.get(id) ?? Infinity
    if (score < bestScore) {
      bestScore = score
      best = id
    }
  }

  return best
}

/**
 * Reconstruct path from the came-from map.
 * Returns ordered list from start to end (inclusive).
 */
function reconstructPath(cameFrom: Map<string, string>, current: string): string[] {
  const path: string[] = [current]

  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!
    path.unshift(current)
  }

  return path
}
