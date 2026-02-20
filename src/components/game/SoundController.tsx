'use client'

/**
 * SoundController - Reactive audio bridge
 *
 * Renders null. Subscribes to rtGameStore events and triggers
 * procedural SFX via SoundManager. Mount in the space page.
 */

import { useEffect, useRef } from 'react'
import { useRTGameStore } from '@/stores/rtGameStore'
import { getSoundManager } from '@/lib/audio/SoundManager'

// Ship state enum values (matches server schema)
const SHIP_STATE_MINING = 5

export function SoundController() {
  const prevDamageLen = useRef(0)
  const prevShipCount = useRef(0)
  const prevWarp = useRef(false)
  const prevDocked = useRef(false)
  const miningInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const sm = getSoundManager()

    // Start ambient on first user interaction
    const startAmbient = () => {
      sm.startAmbient()
      document.removeEventListener('click', startAmbient)
      document.removeEventListener('keydown', startAmbient)
    }
    document.addEventListener('click', startAmbient)
    document.addEventListener('keydown', startAmbient)

    // Subscribe to store changes
    const unsub = useRTGameStore.subscribe((state, prevState) => {
      // Damage events -> weapon fire SFX
      if (state.recentDamage.length > prevDamageLen.current) {
        sm.playWeaponFire()
      }
      prevDamageLen.current = state.recentDamage.length

      // Ship destroyed -> explosion SFX
      if (state.ships.size < prevShipCount.current && prevShipCount.current > 0) {
        sm.playExplosion()
      }
      prevShipCount.current = state.ships.size

      // Warp state changes
      if (state.warpActive && !prevWarp.current) {
        sm.playWarpStart()
      } else if (!state.warpActive && prevWarp.current) {
        sm.playWarpEnd()
      }
      prevWarp.current = state.warpActive

      // Docking state changes
      if (state.isDocked && !prevDocked.current) {
        sm.playDock()
      }
      prevDocked.current = state.isDocked

      // Mining state -> rhythmic ticking
      const myShip = state.ships.get(state.myShipId)
      const isMining = myShip?.state === SHIP_STATE_MINING

      if (isMining && !miningInterval.current) {
        miningInterval.current = setInterval(() => sm.playMiningTick(), 1500)
      } else if (!isMining && miningInterval.current) {
        clearInterval(miningInterval.current)
        miningInterval.current = null
      }
    })

    return () => {
      unsub()
      sm.stopAmbient()
      document.removeEventListener('click', startAmbient)
      document.removeEventListener('keydown', startAmbient)
      if (miningInterval.current) {
        clearInterval(miningInterval.current)
        miningInterval.current = null
      }
    }
  }, [])

  return null
}
