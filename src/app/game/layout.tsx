import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/game/Header'
import { Sidebar } from '@/components/game/Sidebar'
import { ResourceBar } from '@/components/game/ResourceBar'
import { GameProvider } from '@/components/game/GameProvider'

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

  // Load user profile
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!user) {
    // User profile doesn't exist yet, might need to wait for trigger
    redirect('/login')
  }

  // Load planets
  const { data: planets } = await supabase
    .from('planets')
    .select('*')
    .eq('user_id', user.id)
    .eq('destroyed', false)
    .order('created_at', { ascending: true })

  // Load research
  const { data: research } = await supabase
    .from('user_research')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!planets || planets.length === 0 || !research) {
    // Data not ready yet
    redirect('/login')
  }

  return (
    <GameProvider
      initialUser={user}
      initialPlanets={planets}
      initialResearch={research}
    >
      <div className="min-h-screen flex flex-col bg-ogame-bg">
        <Header />
        <ResourceBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </GameProvider>
  )
}
