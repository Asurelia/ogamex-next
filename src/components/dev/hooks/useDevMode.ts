'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface DevModeState {
  isAdmin: boolean
  isEnabled: boolean
  adminRole: string | null
  setEnabled: (enabled: boolean) => void
}

export function useDevMode(): DevModeState {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRole, setAdminRole] = useState<string | null>(null)
  const [isEnabled, setIsEnabled] = useState(true)

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsAdmin(false)
        return
      }

      const { data: role } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (role) {
        setIsAdmin(true)
        setAdminRole(role.role)
      }
    } catch (error) {
      console.error('[DevMode] Failed to check admin status:', error)
      setIsAdmin(false)
    }
  }

  return {
    isAdmin,
    isEnabled: isAdmin && isEnabled,
    adminRole,
    setEnabled: setIsEnabled,
  }
}
