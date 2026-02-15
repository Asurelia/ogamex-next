/**
 * System Discovery API
 * GET: Get discovery info for a specific system
 * PATCH: Upgrade discovery level
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExplorationService } from '@/lib/exploration'

interface RouteParams {
  params: Promise<{ systemId: string }>
}

// GET /api/v1/exploration/[systemId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { systemId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const explorationService = new ExplorationService(supabase)

    // Get discovery info
    const discovery = await explorationService.getDiscovery(user.id, systemId)

    if (!discovery) {
      // Check if system is at least connected (visible but not discovered)
      const { visible, level } = await explorationService.isSystemVisible(user.id, systemId)

      if (!visible) {
        return NextResponse.json(
          { error: 'System not visible' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        systemId,
        visibility: level,
        discovered: false
      })
    }

    // Get first discovery info
    const firstDiscovery = await explorationService.getFirstDiscovery(systemId)

    // Get connections
    const connections = await explorationService.getSystemConnections(systemId)

    return NextResponse.json({
      systemId,
      discovery,
      firstDiscovery: firstDiscovery ? {
        discoveredBy: firstDiscovery.userId,
        discoveredAt: firstDiscovery.discoveredAt,
        isYou: firstDiscovery.userId === user.id,
        bonusClaimed: firstDiscovery.discoveryBonusClaimed,
        bonusType: firstDiscovery.bonusType,
        bonusAmount: firstDiscovery.bonusAmount
      } : null,
      connections: connections.map(c => ({
        id: c.id,
        targetSystemId: c.systemAId === systemId ? c.systemBId : c.systemAId,
        type: c.connectionType,
        distance: c.distance,
        isStable: c.isStable,
        expiresAt: c.expiresAt
      }))
    })
  } catch (error) {
    console.error('[Exploration API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/exploration/[systemId]
// Body: {
//   discoveryLevel: 'scanned' | 'explored' | 'mapped',
//   scanQuality: number (0-100)
// }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { systemId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { discoveryLevel, scanQuality } = body

    // Validation
    const validLevels = ['scanned', 'explored', 'mapped']
    if (!validLevels.includes(discoveryLevel)) {
      return NextResponse.json(
        { error: 'Invalid discovery level' },
        { status: 400 }
      )
    }

    const explorationService = new ExplorationService(supabase)

    // Check existing discovery
    const existing = await explorationService.getDiscovery(user.id, systemId)
    if (!existing) {
      return NextResponse.json(
        { error: 'System not discovered yet' },
        { status: 400 }
      )
    }

    // Upgrade discovery
    const result = await explorationService.upgradeDiscoveryLevel(
      user.id,
      systemId,
      discoveryLevel,
      Math.min(100, Math.max(0, scanQuality || existing.scanQuality))
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to upgrade discovery' },
        { status: 400 }
      )
    }

    // Get updated discovery
    const updated = await explorationService.getDiscovery(user.id, systemId)

    return NextResponse.json({
      success: true,
      discovery: updated
    })
  } catch (error) {
    console.error('[Exploration API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
