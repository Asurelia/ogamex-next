import { create } from 'zustand'
import type { Planet, User, UserResearch, BuildingQueue, ResearchQueue, FleetMission } from '@/types/database'

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
}))
