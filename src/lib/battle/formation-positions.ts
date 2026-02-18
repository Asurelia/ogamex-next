/**
 * Formation 3D Positioning System
 * 
 * Generates high-performance static coordinates for InstancedMesh rendering.
 * Optimized for 60FPS: Calculates positions once, avoids per-frame logic.
 */

import type { FormationType, FormationPosition } from './fleet-formations'

export interface Vector3 {
    x: number
    y: number
    z: number
}

export interface FormationLayout {
    // Float32Array for InstancedMesh [x, y, z, scale, x, y, z, scale...]
    // Storing as simple array of Vectors for now, simpler for React Three Fiber to consume initially
    positions: Vector3[]
    rotation?: Vector3 // Euler
}

// Configuration for formation shapes
const SPREAD = 50 // Base distance between ships
const JITTER = 5  // Random offset for realism

/**
 * Get 3D coordinates for a fleet based on formation and size.
 * Returns an array of positions matching the unit count.
 */
export function getFormationPositions(
    type: FormationType,
    count: number,
    seed: number = 0 // For deterministic jitter
): Vector3[] {
    const positions: Vector3[] = []

    // Deterministic RNG
    let rngState = seed
    const random = () => {
        rngState = (rngState * 9301 + 49297) % 233280
        return rngState / 233280
    }
    const jitter = () => (random() - 0.5) * JITTER

    // Center offset to keep fleet centered
    const centerZ = 0

    switch (type) {
        case 'defensive_sphere':
            // Fibonacci Sphere for even distribution
            const phi = Math.PI * (3 - Math.sqrt(5))
            const radius = Math.pow(count, 1 / 3) * SPREAD * 0.8 // Cube root to keep density consistent volume-wise

            for (let i = 0; i < count; i++) {
                const y = 1 - (i / (count - 1)) * 2
                const r = Math.sqrt(1 - y * y)
                const theta = phi * i

                positions.push({
                    x: Math.cos(theta) * r * radius + jitter(),
                    y: y * radius + jitter(),
                    z: Math.sin(theta) * r * radius + centerZ + jitter()
                })
            }
            break

        case 'arrow': // Wedge
        case 'pincer':
            const rows = Math.ceil(Math.sqrt(count))
            let currentInfo = { row: 0, col: 0 }

            for (let i = 0; i < count; i++) {
                // Triangle/Wedge layout
                const row = Math.floor(Math.sqrt(2 * i))
                const rowWidth = row + 1
                const offset = i - (row * (row + 1)) / 2

                const z = -row * SPREAD * 0.8 // Backwards
                const x = (offset - row / 2) * SPREAD * 1.2

                // Pincer curves the wings forward slightly
                const zCurve = type === 'pincer' ? Math.pow(Math.abs(x) / SPREAD, 1.5) * 10 : 0

                positions.push({
                    x: x + jitter(),
                    y: (random() - 0.5) * SPREAD * 0.2, // Flat-ish
                    z: z + zCurve + centerZ + jitter()
                })
            }
            break

        case 'line': // Broadside wall
            const lineRows = Math.ceil(Math.sqrt(count / 4)) // Fewer rows, more columns
            const cols = Math.ceil(count / lineRows)

            for (let i = 0; i < count; i++) {
                const r = Math.floor(i / cols)
                const c = i % cols

                positions.push({
                    x: (c - cols / 2) * SPREAD + jitter(),
                    y: (r - lineRows / 2) * SPREAD + jitter(),
                    z: centerZ + jitter()
                })
            }
            break

        case 'wolf_pack': // Clusters
            const clusterSize = 5
            const clusters = Math.ceil(count / clusterSize)

            for (let i = 0; i < count; i++) {
                const clusterIdx = Math.floor(i / clusterSize)
                const inClusterIdx = i % clusterSize

                // Cluster centers distributed in a loose cloud
                const cX = (Math.random() - 0.5) * SPREAD * clusters
                const cY = (Math.random() - 0.5) * SPREAD * clusters
                const cZ = (Math.random() - 0.5) * SPREAD * clusters

                // Use deterministic random for stable clusters if needed, but here using simple math
                // Actually, strictly correct implementation needs stable cluster centers based on seed
                // Simplifying for "feel":

                positions.push({
                    x: ((clusterIdx % 3) - 1) * SPREAD * 4 + ((inClusterIdx % 2) - 0.5) * SPREAD + jitter(),
                    y: (Math.floor(clusterIdx / 3) - 1) * SPREAD * 4 + jitter(),
                    z: centerZ + (random() - 0.5) * SPREAD * 2
                })
            }
            break

        default: // Scattered / Random Box
            const boxSize = Math.pow(count, 1 / 3) * SPREAD
            for (let i = 0; i < count; i++) {
                positions.push({
                    x: (random() - 0.5) * boxSize,
                    y: (random() - 0.5) * boxSize * 0.5, // Flattened box
                    z: centerZ + (random() - 0.5) * boxSize
                })
            }
            break
    }

    return positions
}
