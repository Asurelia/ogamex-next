import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'

/**
 * GET /api/v1/player
 * Get current player information
 */
async function getPlayer(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()

  const { data: player } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: research } = await supabase
    .from('user_research')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { data: planets } = await supabase
    .from('planets')
    .select('id, name, galaxy, system, position, planet_type')
    .eq('user_id', user.id)
    .eq('destroyed', false)

  const { data: highscore } = await supabase
    .from('highscores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    player: {
      id: player?.id,
      username: player?.username,
      email: player?.email,
      dark_matter: player?.dark_matter,
      character_class: player?.character_class,
      vacation_mode: player?.vacation_mode,
      alliance_id: player?.alliance_id,
      created_at: player?.created_at,
    },
    research: research ? {
      energy_technology: research.energy_technology,
      laser_technology: research.laser_technology,
      ion_technology: research.ion_technology,
      hyperspace_technology: research.hyperspace_technology,
      plasma_technology: research.plasma_technology,
      combustion_drive: research.combustion_drive,
      impulse_drive: research.impulse_drive,
      hyperspace_drive: research.hyperspace_drive,
      espionage_technology: research.espionage_technology,
      computer_technology: research.computer_technology,
      astrophysics: research.astrophysics,
      intergalactic_research_network: research.intergalactic_research_network,
      graviton_technology: research.graviton_technology,
      weapons_technology: research.weapons_technology,
      shielding_technology: research.shielding_technology,
      armor_technology: research.armor_technology,
    } : null,
    planets: planets || [],
    highscore: highscore ? {
      total_points: highscore.total_points,
      economy_points: highscore.economy_points,
      research_points: highscore.research_points,
      military_points: highscore.military_points,
      rank: highscore.rank,
    } : null,
  })
}

export const GET = withAuth(getPlayer)
