/**
 * Admin Store
 * Zustand store for admin panel state management
 */

import { create } from 'zustand'
import type { AdminUser, GameConfigEntry, GameBoostType, GameCurrency } from '@/types/admin'

interface AdminState {
  // User state
  adminUser: AdminUser | null
  isLoading: boolean
  error: string | null

  // Config cache
  gameConfig: Record<string, GameConfigEntry>
  boostTypes: GameBoostType[]
  currencies: GameCurrency[]

  // UI state
  sidebarCollapsed: boolean
  currentSection: string | null

  // Actions
  setAdminUser: (user: AdminUser | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setGameConfig: (config: Record<string, GameConfigEntry>) => void
  updateConfigValue: (key: string, value: unknown) => void
  setBoostTypes: (types: GameBoostType[]) => void
  setCurrencies: (currencies: GameCurrency[]) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCurrentSection: (section: string | null) => void
  reset: () => void
}

const initialState = {
  adminUser: null,
  isLoading: true,
  error: null,
  gameConfig: {},
  boostTypes: [],
  currencies: [],
  sidebarCollapsed: false,
  currentSection: null,
}

export const useAdminStore = create<AdminState>((set) => ({
  ...initialState,

  setAdminUser: (user) => set({ adminUser: user, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  setGameConfig: (config) => set({ gameConfig: config }),

  updateConfigValue: (key, value) =>
    set((state) => {
      const existingEntry = state.gameConfig[key]
      if (!existingEntry) return state
      return {
        gameConfig: {
          ...state.gameConfig,
          [key]: { ...existingEntry, value },
        },
      }
    }),

  setBoostTypes: (types) => set({ boostTypes: types }),

  setCurrencies: (currencies) => set({ currencies }),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setCurrentSection: (section) => set({ currentSection: section }),

  reset: () => set(initialState),
}))

/**
 * Hook to check if current admin has permission
 */
export function useAdminPermission(permission: string): boolean {
  const adminUser = useAdminStore((state) => state.adminUser)
  if (!adminUser) return false
  if (adminUser.role === 'super_admin') return true
  return adminUser.permissions.includes(permission) || adminUser.permissions.includes('*')
}
