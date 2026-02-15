'use client'

import { useEffect } from 'react'
import { useAdminStore } from '@/stores/adminStore'
import { AdminSidebar, AdminHeader } from '@/components/admin/layout'
import type { AdminUser } from '@/types/admin'

interface AdminLayoutClientProps {
  initialAdminUser: AdminUser
  children: React.ReactNode
}

export function AdminLayoutClient({ initialAdminUser, children }: AdminLayoutClientProps) {
  const { setAdminUser, sidebarCollapsed } = useAdminStore()

  useEffect(() => {
    setAdminUser(initialAdminUser)
  }, [initialAdminUser, setAdminUser])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <AdminHeader />
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'pl-16' : 'pl-64'
        }`}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AdminLayoutClient
