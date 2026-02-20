/**
 * Scanning System
 *
 * Probe triangulation and scan strength calculation.
 * All persistence via SQLite (persistence.ts).
 */

import {
  launchProbes as launchProbesPersist, getProbes, getScanResults,
  createScanResult, updateScanStrength,
} from '../services/persistence'

// ============================================================================
// SCANNING
// ============================================================================

export function launchProbes(
  userId: string,
  systemId: string,
  positions: Array<{ x: number; y: number; z: number }>,
  scanRadius: number = 8,
  probeType: string = 'core'
): void {
  launchProbesPersist(userId, systemId, positions, scanRadius, probeType)
}

export function performScan(
  userId: string,
  systemId: string
): Array<{
  signatureId: string
  signatureType: string
  scanStrength: number
  resolved: boolean
  position?: { x: number; y: number; z: number }
}> {
  // Get probes
  const probes = getProbes(userId, systemId)
  if (probes.length === 0) return []

  // Get existing scan results or generate new signatures
  let results = getScanResults(systemId, userId)
  if (results.length === 0) {
    results = generateSignatures(systemId, userId)
  }

  // Calculate scan strength based on probe triangulation
  const updatedResults = []
  for (const result of results) {
    const prevStrength = result.scan_strength as number
    const newStrength = calculateTriangulationStrength(probes, result)
    const finalStrength = Math.min(100, Math.max(prevStrength, newStrength))
    const resolved = finalStrength >= 100

    updateScanStrength(result.id as string, finalStrength, resolved)

    updatedResults.push({
      signatureId: result.signature_id as string,
      signatureType: resolved ? (result.signature_type as string) : 'unknown',
      scanStrength: finalStrength,
      resolved,
      position: resolved && result.position_x !== null
        ? { x: result.position_x as number, y: result.position_y as number, z: result.position_z as number }
        : undefined,
    })
  }

  return updatedResults
}

function calculateTriangulationStrength(
  probes: Array<Record<string, unknown>>,
  signature: Record<string, unknown>
): number {
  if (probes.length < 4) return probes.length * 15

  const sigX = (signature.position_x as number) || 0
  const sigY = (signature.position_y as number) || 0
  const sigZ = (signature.position_z as number) || 0

  let totalStrength = 0
  for (const probe of probes) {
    const dx = (probe.position_x as number) - sigX
    const dy = (probe.position_y as number) - sigY
    const dz = (probe.position_z as number) - sigZ
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const radius = (probe.scan_radius as number) * 149597870700

    if (dist <= radius) {
      const coverage = 1 - (dist / radius)
      totalStrength += coverage * 25
    }
  }

  return Math.min(100, totalStrength)
}

function generateSignatures(systemId: string, scannerId: string): Record<string, unknown>[] {
  const signatureTypes = ['wormhole', 'data_site', 'relic_site', 'gas_site', 'combat_site', 'ore_site']
  const count = 3 + Math.floor(Math.random() * 5)

  const results: Record<string, unknown>[] = []
  for (let i = 0; i < count; i++) {
    const sigId = `SIG-${systemId.slice(0, 4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`
    const sigType = signatureTypes[Math.floor(Math.random() * signatureTypes.length)]
    const x = (Math.random() - 0.5) * 500000000
    const y = (Math.random() - 0.5) * 100000000
    const z = (Math.random() - 0.5) * 500000000

    const result = createScanResult(systemId, scannerId, sigId, sigType, x, y, z)
    results.push(result)
  }

  return results
}
