import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayoutClient } from './AdminLayoutClient'

export const metadata = {
  title: 'OGameX Admin Panel',
  description: 'Administration panel for OGameX',
}

export default async function AdminLayout({
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

  // Check if user is admin
  const { data: adminRole, error } = await supabase
    .from('admin_roles')
    .select('*')
    .eq('user_id', authUser.id)
    .eq('active', true)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !adminRole) {
    // Not an admin, redirect to game
    redirect('/game')
  }

  // Get user details
  const { data: userData } = await supabase
    .from('users')
    .select('username, email')
    .eq('id', authUser.id)
    .single()

  const adminUser = {
    id: authUser.id,
    username: userData?.username || 'Unknown',
    email: userData?.email || authUser.email || '',
    role: adminRole.role,
    permissions: adminRole.permissions || [],
    expires_at: adminRole.expires_at,
  }

  return (
    <AdminLayoutClient initialAdminUser={adminUser}>
      {children}
    </AdminLayoutClient>
  )
}
