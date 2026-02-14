import { create } from 'zustand'
import type { Planet, User, UserResearch, BuildingQueue, ResearchQueue, FleetMission } from '@/types/database'

// Types pour la visualisation 3D
export type VisualizationMode = '2d' | '3d' | 'tactical'
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

  // UI State
  isSidebarOpen: boolean
  toggleSidebar: () => void

  // Resource updates (real-time)
  updatePlanetResources: (planetId: string, resources: Partial<Planet>) => void

  // Reset
  reset: () => void

  // 3D Visualization - Modes
  visualizationMode: VisualizationMode
  setVisualizationMode: (mode: VisualizationMode) => void

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
  isSidebarOpen: true,
  // 3D Visualization defaults
  visualizationMode: '2d' as VisualizationMode,
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
  setVisualizationMode: (mode) => set({ visualizationMode: mode }),

  setSelectedObject3D: (obj) => set({ selectedObject3D: obj }),

  setCameraMode: (mode) => set({ cameraMode: mode }),

  updatePreferences3D: (prefs) => set((state) => ({
    preferences3D: { ...state.preferences3D, ...prefs }
  })),
}))
