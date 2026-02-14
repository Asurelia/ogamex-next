import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GameProvider } from '@/components/game/GameProvider'
import { GameLayoutClient } from '@/components/game/GameLayoutClient'

// Helper to wait and retry fetching user data
async function waitForUserData(supabase: any, userId: string, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (user) {
      const { data: planets } = await supabase
        .from('planets')
        .select('*')
        .eq('user_id', user.id)
        .eq('destroyed', false)
        .order('created_at', { ascending: true })

      const { data: research } = await supabase
        .from('user_research')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (planets && planets.length > 0 && research) {
        return { user, planets, research }
      }
    }

    // Wait before retry (exponential backoff)
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
    }
  }
  return null
}

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Wait for user data with retry logic (handles trigger propagation delay)
  const userData = await waitForUserData(supabase, authUser.id)

  if (!userData) {
    // After retries, still no data - redirect to login
    redirect('/login')
  }

  const { user, planets, research } = userData

  return (
    <GameProvider
      initialUser={user}
      initialPlanets={planets}
      initialResearch={research}
    >
      <GameLayoutClient>
        {children}
      </GameLayoutClient>
    </GameProvider>
  )
}
