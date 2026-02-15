'use client'

import { useRouter } from 'next/navigation'
import { useAdminStore } from '@/stores/adminStore'
import { getSupabaseClient } from '@/lib/supabase/client'

export function AdminHeader() {
  const router = useRouter()
  const { adminUser, sidebarCollapsed } = useAdminStore()

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-gray-900/95 border-b border-cyan-500/20 flex items-center justify-between px-6 z-30 transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Breadcrumb / Title area */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Quick Actions */}
        <button
          onClick={() => router.push('/admin/players')}
          className="px-3 py-1.5 text-sm bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
        >
          🔍 Search Players
        </button>

        {/* Cache invalidation */}
        <button
          onClick={async () => {
            try {
              await fetch('/api/admin/config/cache', { method: 'POST' })
              alert('Cache invalidated successfully')
            } catch {
              alert('Failed to invalidate cache')
            }
          }}
          className="px-3 py-1.5 text-sm bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg transition-colors"
          title="Invalidate game config cache"
        >
          🔄 Clear Cache
        </button>

        {/* User dropdown */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
          <div className="text-right">
            <div className="text-sm font-medium text-white">{adminUser?.username}</div>
            <div className="text-xs text-gray-400">{adminUser?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
            title="Logout"
          >
            🚪
          </button>
        </div>
      </div>
    </header>
  )
}

export default AdminHeader
