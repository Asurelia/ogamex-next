import { create } from 'zustand'
import type { Planet, User, UserResearch, BuildingQueue, ResearchQueue, FleetMission, ActiveBoost } from '@/types/database'

// Types pour la visualisation 3D
export type CameraMode = 'orbit' | 'first-person' | 'strategic'
export type SelectedObject3DType = 'planet' | 'fleet' | 'building' | 'debris'

export interface SelectedObject3D {
  type: SelectedObject3DType
  id: string
}

export interface Preferences3D {
  postprocessingEnabled: boolean
  starsCount: number
  rotationSpeed: number
  showOrbits: boolean
  showLabels: boolean
}

interface GameState {
  // User data
  user: User | null
  setUser: (user: User | null) => void

  // Research data
  research: UserResearch | null
  setResearch: (research: UserResearch | null) => void

  // Planets
  planets: Planet[]
  setPlanets: (planets: Planet[]) => void
  currentPlanet: Planet | null
  setCurrentPlanet: (planet: Planet | null) => void
  selectPlanet: (planetId: string) => void

  // Queues
  buildingQueue: BuildingQueue[]
  setBuildingQueue: (queue: BuildingQueue[]) => void
  researchQueue: ResearchQueue[]
  setResearchQueue: (queue: ResearchQueue[]) => void

  // Fleet missions
  fleetMissions: FleetMission[]
  setFleetMissions: (missions: FleetMission[]) => void

  // Active boosts
  activeBoosts: ActiveBoost[]
  setActiveBoosts: (boosts: ActiveBoost[]) => void

  // Computed boost energy (real-time)
  getBoostEnergy: () => number
  getBoostEnergyPercent: () => number
  getTimeToFullEnergy: () => number // seconds

  // Active boost helpers
  getActiveBoost: (type: string) => ActiveBoost | undefined
  getBoostMultiplier: (type: string) => number // Returns 1.0 if no boost, else multiplier
  isBoostActive: (type: string) => boolean
  getBoostRemainingSeconds: (type: string) => number

  // UI State
  isSidebarOpen: boolean
  toggleSidebar: () => void

  // Resource updates (real-time)
  updatePlanetResources: (planetId: string, resources: Partial<Planet>) => void

  // Reset
  reset: () => void

  // 3D Visualization - Selection
  selectedObject3D: SelectedObject3D | null
  setSelectedObject3D: (obj: SelectedObject3D | null) => void

  // 3D Visualization - Camera
  cameraMode: CameraMode
  setCameraMode: (mode: CameraMode) => void

  // 3D Visualization - Preferences
  preferences3D: Preferences3D
  updatePreferences3D: (prefs: Partial<Preferences3D>) => void
}

// Valeurs par defaut pour les preferences 3D
const defaultPreferences3D: Preferences3D = {
  postprocessingEnabled: true,
  starsCount: 5000,
  rotationSpeed: 0.001,
  showOrbits: true,
  showLabels: true,
}

const initialState = {
  user: null,
  research: null,
  planets: [],
  currentPlanet: null,
  buildingQueue: [],
  researchQueue: [],
  fleetMissions: [],
  activeBoosts: [] as ActiveBoost[],
  isSidebarOpen: true,
  // 3D Visualization defaults
  selectedObject3D: null as SelectedObject3D | null,
  cameraMode: 'orbit' as CameraMode,
  preferences3D: defaultPreferences3D,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setResearch: (research) => set({ research }),

  setPlanets: (planets) => set({ planets }),
  setCurrentPlanet: (planet) => set({ currentPlanet: planet }),

  selectPlanet: (planetId) => {
    const planet = get().planets.find(p => p.id === planetId)
    if (planet) {
      set({ currentPlanet: planet })
    }
  },

  setBuildingQueue: (queue) => set({ buildingQueue: queue }),
  setResearchQueue: (queue) => set({ researchQueue: queue }),
  setFleetMissions: (missions) => set({ fleetMissions: missions }),
  setActiveBoosts: (boosts) => set({ activeBoosts: boosts }),

  // Calculate current boost energy in real-time (regenerates over time)
  getBoostEnergy: () => {
    const user = get().user
    if (!user) return 0

    const now = Date.now()
    const lastUpdate = new Date(user.last_boost_energy_update).getTime()
    const hoursElapsed = (now - lastUpdate) / (1000 * 60 * 60)

    // Calculate regenerated energy
    const regenRate = user.boost_energy_regen_rate || 8.33 // ~100 in 12h
    const regenerated = hoursElapsed * regenRate
    const currentEnergy = Math.min(
      user.boost_energy_max,
      user.boost_energy + regenerated
    )

    return Math.floor(currentEnergy)
  },

  getBoostEnergyPercent: () => {
    const user = get().user
    if (!user || user.boost_energy_max === 0) return 0
    return Math.min(100, (get().getBoostEnergy() / user.boost_energy_max) * 100)
  },

  getTimeToFullEnergy: () => {
    const user = get().user
    if (!user) return 0

    const currentEnergy = get().getBoostEnergy()
    const missing = user.boost_energy_max - currentEnergy
    if (missing <= 0) return 0

    const regenRate = user.boost_energy_regen_rate || 8.33
    const hoursToFull = missing / regenRate
    return Math.ceil(hoursToFull * 3600) // Convert to seconds
  },

  // Get active boost by type (only if not expired)
  getActiveBoost: (type: string) => {
    const now = new Date()
    return get().activeBoosts.find(
      (b) => b.boost_type === type && new Date(b.ends_at) > now
    )
  },

  // Get multiplier for a boost type (1.0 if no active boost)
  getBoostMultiplier: (type: string) => {
    const boost = get().getActiveBoost(type)
    return boost ? boost.multiplier : 1.0
  },

  // Check if boost is currently active
  isBoostActive: (type: string) => {
    return get().getActiveBoost(type) !== undefined
  },

  // Get remaining seconds for a boost
  getBoostRemainingSeconds: (type: string) => {
    const boost = get().getActiveBoost(type)
    if (!boost) return 0
    const remaining = new Date(boost.ends_at).getTime() - Date.now()
    return Math.max(0, Math.floor(remaining / 1000))
  },

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  updatePlanetResources: (planetId, resources) => {
    set((state) => ({
      planets: state.planets.map(p =>
        p.id === planetId ? { ...p, ...resources } : p
      ),
      currentPlanet: state.currentPlanet?.id === planetId
        ? { ...state.currentPlanet, ...resources }
        : state.currentPlanet,
    }))
  },

  reset: () => set(initialState),

  // 3D Visualization setters
  setSelectedObject3D: (obj) => set({ selectedObject3D: obj }),

  setCameraMode: (mode) => set({ cameraMode: mode }),

  updatePreferences3D: (prefs) => set((state) => ({
    preferences3D: { ...state.preferences3D, ...prefs }
  })),
}))
