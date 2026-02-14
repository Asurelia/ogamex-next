import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { transformBattleReport } from '@/stores/battleStore'
import type { BattleReportData } from '@/types/battle'

/**
 * GET /api/v1/battles/[battleId]
 * Get battle details for 3D visualization
 *
 * Only participants (attacker or defender) can view the battle.
 */
async function getBattle(
  request: NextRequest,
  user: AuthenticatedUser,
  params: { battleId: string }
) {
  const supabase = getApiSupabase()
  const { battleId } = params

  // Get battle report
  const { data: report, error } = await supabase
    .from('battle_reports')
    .select('*')
    .eq('id', battleId)
    .single()

  if (error || !report) {
    return NextResponse.json(
      { error: 'Battle not found' },
      { status: 404 }
    )
  }

  // Verify user is a participant
  if (report.attacker_id !== user.id && report.defender_id !== user.id) {
    return NextResponse.json(
      { error: 'Access denied. You are not a participant in this battle.' },
      { status: 403 }
    )
  }

  // Get participant names
  const { data: attackerUser } = await supabase
    .from('users')
    .select('username, alliance_id')
    .eq('id', report.attacker_id)
    .single()

  const { data: defenderUser } = await supabase
    .from('users')
    .select('username, alliance_id')
    .eq('id', report.defender_id)
    .single()

  // Get alliance tags if applicable
  let attackerAlliance = null
  let defenderAlliance = null

  if (attackerUser?.alliance_id) {
    const { data: alliance } = await supabase
      .from('alliances')
      .select('tag')
      .eq('id', attackerUser.alliance_id)
      .single()
    attackerAlliance = alliance?.tag
  }

  if (defenderUser?.alliance_id) {
    const { data: alliance } = await supabase
      .from('alliances')
      .select('tag')
      .eq('id', defenderUser.alliance_id)
      .single()
    defenderAlliance = alliance?.tag
  }

  // Ensure report_data has player names
  const reportData = report.report_data as BattleReportData
  if (reportData.attacker) {
    reportData.attacker.playerName = attackerUser?.username || 'Unknown'
    reportData.attacker.allianceTag = attackerAlliance || undefined
  }
  if (reportData.defender) {
    reportData.defender.playerName = defenderUser?.username || 'Unknown'
    reportData.defender.allianceTag = defenderAlliance || undefined
  }

  // Transform to Battle format for 3D viewer
  const battle = transformBattleReport({
    ...report,
    report_data: reportData,
  })

  return NextResponse.json({
    success: true,
    battle,
    isAttacker: report.attacker_id === user.id,
  })
}

/**
 * Route handler wrapper to extract params
 */
export const GET = (
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) => {
  return params.then(resolvedParams => {
    return withAuth((req, user) => getBattle(req, user, resolvedParams))(request)
  })
}
