'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  HoloModal,
  HoloCard,
  HoloButton,
  HoloInput,
  HoloBadge,
  HoloProgress,
  HoloCountdown,
} from '@/components/ui'
import { useGameStore } from '@/stores/gameStore'
import { SHIPS } from '@/game/constants'
import {
  formatNumber,
  formatDuration,
  calculateDistance,
  calculateFleetDuration,
  getSlowestShipSpeed,
  calculateFuelConsumption,
} from '@/game/formulas'
import type { ACSOperation, JoinACSParams } from '@/types/acs'

interface JoinACSModalProps {
  isOpen: boolean
  onClose: () => void
  operation: ACSOperation | null
  onSubmit: (params: JoinACSParams) => Promise<void>
}

interface ShipSelection {
  [shipId: number]: number
}

export function JoinACSModal({
  isOpen,
  onClose,
  operation,
  onSubmit,
}: JoinACSModalProps) {
  const t = useTranslations('fleet.acs')
  const tCommon = useTranslations('common')

  const { currentPlanet, research } = useGameStore()

  const [selectedShips, setSelectedShips] = useState<ShipSelection>({})
  const [speedPercent, setSpeedPercent] = useState(100)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setSelectedShips({})
    setSpeedPercent(100)
    setError(null)
    onClose()
  }, [onClose])

  // Get ship count from current planet
  const getShipCount = useCallback(
    (key: string): number => {
      if (!currentPlanet) return 0
      return (currentPlanet as unknown as Record<string, number>)[key] || 0
    },
    [currentPlanet]
  )

  // Available ships
  const ships = Object.values(SHIPS)
  const availableShips = ships.filter((ship) => getShipCount(ship.key) > 0)

  // Total selected ships
  const totalSelectedShips = Object.values(selectedShips).reduce((sum, count) => sum + count, 0)

  // Calculate flight info
  const flightInfo = useMemo(() => {
    if (!currentPlanet || !operation || totalSelectedShips === 0) return null

    const shipsArray = Object.entries(selectedShips)
      .filter(([_, amount]) => amount > 0)
      .map(([shipId, amount]) => ({ shipId: parseInt(shipId), amount }))

    if (shipsArray.length === 0) return null

    const combustionLevel = research?.combustion_drive ?? 0
    const impulseLevel = research?.impulse_drive ?? 0
    const hyperspaceLevel = research?.hyperspace_drive ?? 0

    const distance = calculateDistance(
      currentPlanet.galaxy,
      currentPlanet.system,
      currentPlanet.position,
      operation.target_coordinates.galaxy,
      operation.target_coordinates.system,
      operation.target_coordinates.position
    )

    const slowestSpeed = getSlowestShipSpeed(
      shipsArray,
      combustionLevel,
      impulseLevel,
      hyperspaceLevel
    )
    const duration = calculateFleetDuration(distance, slowestSpeed, speedPercent, 1)
    const fuel = calculateFuelConsumption(shipsArray, distance, duration, speedPercent)

    const arrivalTime = new Date(Date.now() + duration * 1000)

    // Check if we can make it in time
    const scheduledArrival = new Date(operation.scheduled_arrival)
    const canMakeIt = arrivalTime <= scheduledArrival

    return { distance, duration, fuel, arrivalTime, canMakeIt }
  }, [
    currentPlanet,
    operation,
    selectedShips,
    totalSelectedShips,
    speedPercent,
    research,
  ])

  // Handle ship selection change
  const handleShipChange = (shipId: number, value: number, max: number) => {
    setSelectedShips((prev) => ({
      ...prev,
      [shipId]: Math.max(0, Math.min(value, max)),
    }))
  }

  // Select all ships
  const selectAllShips = () => {
    const all: ShipSelection = {}
    ships.forEach((ship) => {
      const count = getShipCount(ship.key)
      if (count > 0) all[ship.id] = count
    })
    setSelectedShips(all)
  }

  // Clear ship selection
  const clearShipSelection = () => {
    setSelectedShips({})
  }

  // Submit form
  const handleSubmit = async () => {
    if (!operation || !flightInfo) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Convert selectedShips to the correct format
      const shipsObj: Record<string, number> = {}
      Object.entries(selectedShips).forEach(([shipId, count]) => {
        const ship = SHIPS[parseInt(shipId)]
        if (ship && count > 0) {
          shipsObj[ship.key] = count
        }
      })

      await onSubmit({
        operation_id: operation.id,
        ships: shipsObj,
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join operation')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!operation) return null

  const targetCoords = `[${operation.target_coordinates.galaxy}:${operation.target_coordinates.system}:${operation.target_coordinates.position}]`
  const scheduledArrival = new Date(operation.scheduled_arrival)

  return (
    <HoloModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('joinOperation')}
      size="lg"
    >
      {/* Operation Info */}
      <div
        className="p-4 rounded-lg mb-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(200, 0, 255, 0.05))',
          border: '1px solid rgba(255, 0, 255, 0.3)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-fuchsia-300 font-bold">{operation.name}</h3>
          <HoloBadge
            variant={operation.type === 'attack' ? 'danger' : 'default'}
            glow
          >
            {t(`type.${operation.type}`)}
          </HoloBadge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-cyan-200/60">{t('target')}:</span>
            <span className="text-cyan-300 font-mono ml-2">{targetCoords}</span>
          </div>
          <div>
            <span className="text-cyan-200/60">{t('participants')}:</span>
            <span className="text-cyan-300 ml-2">
              {operation.participants.length}/{operation.max_participants}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-cyan-200/60 text-sm">{t('arrivalIn')}:</span>
          <div className="mt-1">
            <HoloCountdown targetDate={scheduledArrival} format="compact" />
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 80, 80, 0.2), rgba(255, 50, 50, 0.1))',
            border: '1px solid rgba(255, 80, 80, 0.5)',
            color: '#ff8080',
          }}
        >
          {error}
        </motion.div>
      )}

      {/* Fleet Selection */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-cyan-200/70 text-sm">{t('selectFleet')}</span>
          <div className="flex gap-2">
            <HoloButton onClick={selectAllShips} size="sm" variant="ghost">
              {tCommon('all')}
            </HoloButton>
            <HoloButton onClick={clearShipSelection} size="sm" variant="ghost">
              {tCommon('none')}
            </HoloButton>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-2">
          {availableShips.map((ship) => {
            const available = getShipCount(ship.key)
            const selected = selectedShips[ship.id] || 0

            return (
              <div
                key={ship.id}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{
                  background: 'rgba(10, 25, 40, 0.5)',
                  border: '1px solid rgba(0, 255, 255, 0.1)',
                }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`/img/objects/units/${ship.key}_small.jpg`}
                    alt={ship.name}
                    className="w-8 h-8 rounded border border-cyan-500/30"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div>
                    <div className="text-cyan-200 text-sm">{ship.name}</div>
                    <div className="text-xs text-cyan-200/50">
                      {t('available')}: {available}
                    </div>
                  </div>
                </div>
                <HoloInput
                  type="number"
                  min={0}
                  max={available}
                  value={selected || ''}
                  onChange={(val) => handleShipChange(ship.id, parseInt(val) || 0, available)}
                  className="w-20"
                />
              </div>
            )
          })}

          {availableShips.length === 0 && (
            <div className="text-center text-cyan-200/50 py-8">{t('noShipsAvailable')}</div>
          )}
        </div>
      </div>

      {/* Speed Slider */}
      <div className="mb-4">
        <label className="block text-cyan-200/70 text-sm mb-2">
          {t('speed') || 'Speed'}: {speedPercent}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={speedPercent}
          onChange={(e) => setSpeedPercent(parseInt(e.target.value))}
          className="w-full accent-fuchsia-400"
        />
      </div>

      {/* Flight Info */}
      {flightInfo && (
        <div
          className="p-3 rounded-lg mb-4"
          style={{
            background: flightInfo.canMakeIt
              ? 'rgba(0, 255, 136, 0.1)'
              : 'rgba(255, 68, 68, 0.1)',
            border: `1px solid ${flightInfo.canMakeIt ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`,
          }}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-cyan-200/60">{t('totalShips')}:</span>
              <span className="text-cyan-300 ml-2 font-mono">{totalSelectedShips}</span>
            </div>
            <div>
              <span className="text-cyan-200/60">{t('fuelCost')}:</span>
              <span
                className={`ml-2 font-mono ${
                  flightInfo.fuel > (currentPlanet?.deuterium || 0) ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {formatNumber(flightInfo.fuel)}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {flightInfo.canMakeIt ? (
              <>
                <svg
                  className="w-4 h-4 text-green-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                <span className="text-green-400 text-sm">Fleet can arrive in time</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-red-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <span className="text-red-400 text-sm">Fleet too slow - cannot make it in time</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <HoloButton onClick={handleClose} variant="ghost">
          {tCommon('cancel')}
        </HoloButton>
        <HoloButton
          onClick={handleSubmit}
          variant="primary"
          loading={isSubmitting}
          disabled={totalSelectedShips === 0 || !flightInfo?.canMakeIt}
        >
          {t('joinOperation')}
        </HoloButton>
      </div>
    </HoloModal>
  )
}

export default JoinACSModal
