'use client'

import { useEffect, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Planet, User, UserResearch } from '@/types/database'

interface GameProviderProps {
  children: React.ReactNode
  initialUser: User
  initialPlanets: Planet[]
  initialResearch: UserResearch
}

export function GameProvider({
  children,
  initialUser,
  initialPlanets,
  initialResearch,
}: GameProviderProps) {
  const {
    setUser,
    setPlanets,
    setCurrentPlanet,
    setResearch,
    setBuildingQueue,
    setResearchQueue,
    setFleetMissions,
    updatePlanetResources,
    currentPlanet,
  } = useGameStore()

  // Initialize store with server data
  useEffect(() => {
    setUser(initialUser)
    setPlanets(initialPlanets)
    setResearch(initialResearch)

    // Set first planet as current if none selected
    if (initialPlanets.length > 0) {
      setCurrentPlanet(initialPlanets[0])
    }
  }, [initialUser, initialPlanets, initialResearch, setUser, setPlanets, setCurrentPlanet, setResearch])

  // Load queues and missions
  useEffect(() => {
    const loadQueues = async () => {
      const supabase = getSupabaseClient()

      // Load building queue for current planet
      if (currentPlanet) {
        const { data: buildingQueue } = await supabase
          .from('building_queue')
          .select('*')
          .eq('planet_id', currentPlanet.id)
          .order('created_at', { ascending: true })

        if (buildingQueue) {
          setBuildingQueue(buildingQueue)
        }
      }

      // Load research queue
      const { data: researchQueue } = await supabase
        .from('research_queue')
        .select('*')
        .eq('user_id', initialUser.id)
        .order('created_at', { ascending: true })

      if (researchQueue) {
        setResearchQueue(researchQueue)
      }

      // Load fleet missions
      const { data: fleetMissions } = await supabase
        .from('fleet_missions')
        .select('*')
        .eq('user_id', initialUser.id)
        .eq('processed', false)
        .order('arrives_at', { ascending: true })

      if (fleetMissions) {
        setFleetMissions(fleetMissions)
      }
    }

    loadQueues()
  }, [currentPlanet, initialUser.id, setBuildingQueue, setResearchQueue, setFleetMissions])

  // Real-time resource updates (tick every second)
  const updateResources = useCallback(() => {
    const { planets, currentPlanet: current } = useGameStore.getState()

    planets.forEach((planet) => {
      const now = Date.now()
      const lastUpdate = new Date(planet.last_resource_update).getTime()
      const elapsedHours = (now - lastUpdate) / (1000 * 60 * 60)

      if (elapsedHours > 0) {
        const newMetal = Math.min(
          planet.metal + planet.metal_per_hour * elapsedHours,
          planet.metal_max
        )
        const newCrystal = Math.min(
          planet.crystal + planet.crystal_per_hour * elapsedHours,
          planet.crystal_max
        )
        const newDeuterium = Math.min(
          planet.deuterium + planet.deuterium_per_hour * elapsedHours,
          planet.deuterium_max
        )

        updatePlanetResources(planet.id, {
          metal: newMetal,
          crystal: newCrystal,
          deuterium: newDeuterium,
          last_resource_update: new Date().toISOString(),
        })
      }
    })
  }, [updatePlanetResources])

  useEffect(() => {
    const interval = setInterval(updateResources, 1000)
    return () => clearInterval(interval)
  }, [updateResources])

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = getSupabaseClient()

    // Subscribe to planet changes
    const planetsChannel = supabase
      .channel('planets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planets',
          filter: `user_id=eq.${initialUser.id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            updatePlanetResources(payload.new.id, payload.new as Planet)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(planetsChannel)
    }
  }, [initialUser.id, updatePlanetResources])

  return <>{children}</>
}
