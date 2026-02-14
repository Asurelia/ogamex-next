'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  HoloModal,
  HoloCard,
  HoloButton,
  HoloInput,
  HoloTabs,
  HoloBadge,
  HoloProgress,
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
import type { ACSOperationType, CreateACSOperationParams } from '@/types/acs'
import { ACS_MAX_PARTICIPANTS } from '@/types/acs'

interface CreateACSModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (params: CreateACSOperationParams) => Promise<void>
  allianceMembers?: Array<{ id: string; username: string }>
}

type CreateStep = 'type' | 'target' | 'fleet' | 'invite' | 'confirm'

interface ShipSelection {
  [shipId: number]: number
}

export function CreateACSModal({
  isOpen,
  onClose,
  onSubmit,
  allianceMembers = [],
}: CreateACSModalProps) {
  const t = useTranslations('fleet.acs')
  const tCommon = useTranslations('common')
  const tShips = useTranslations('ships')

  const { currentPlanet, research } = useGameStore()

  // Form state
  const [step, setStep] = useState<CreateStep>('type')
  const [operationName, setOperationName] = useState('')
  const [operationType, setOperationType] = useState<ACSOperationType>('attack')
  const [targetGalaxy, setTargetGalaxy] = useState(1)
  const [targetSystem, setTargetSystem] = useState(1)
  const [targetPosition, setTargetPosition] = useState(1)
  const [targetType, setTargetType] = useState<'planet' | 'moon'>('planet')
  const [selectedShips, setSelectedShips] = useState<ShipSelection>({})
  const [speedPercent, setSpeedPercent] = useState(100)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setStep('type')
    setOperationName('')
    setOperationType('attack')
    setTargetGalaxy(1)
    setTargetSystem(1)
    setTargetPosition(1)
    setTargetType('planet')
    setSelectedShips({})
    setSpeedPercent(100)
    setSelectedMembers([])
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
    if (!currentPlanet || totalSelectedShips === 0) return null

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
      targetGalaxy,
      targetSystem,
      targetPosition
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

    return { distance, duration, fuel, arrivalTime }
  }, [
    currentPlanet,
    selectedShips,
    totalSelectedShips,
    targetGalaxy,
    targetSystem,
    targetPosition,
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

  // Toggle member selection
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  // Submit form
  const handleSubmit = async () => {
    if (!flightInfo) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        name: operationName || `${operationType === 'attack' ? 'Attack' : 'Defense'} Operation`,
        type: operationType,
        target_galaxy: targetGalaxy,
        target_system: targetSystem,
        target_position: targetPosition,
        scheduled_arrival: flightInfo.arrivalTime,
        hold_time: 30,
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create operation')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Steps navigation
  const steps: CreateStep[] = ['type', 'target', 'fleet', 'invite', 'confirm']
  const currentStepIndex = steps.indexOf(step)

  const canProceed = useMemo(() => {
    switch (step) {
      case 'type':
        return operationName.length > 0
      case 'target':
        return true
      case 'fleet':
        return totalSelectedShips > 0
      case 'invite':
        return true
      case 'confirm':
        return true
      default:
        return false
    }
  }, [step, operationName, totalSelectedShips])

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex])
    }
  }

  const goBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(steps[prevIndex])
    }
  }

  return (
    <HoloModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('createOperation')}
      size="xl"
    >
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-2 cursor-pointer transition-all ${
                step === s ? 'opacity-100' : 'opacity-40'
              }`}
              onClick={() => {
                if (i <= currentStepIndex) setStep(s)
              }}
            >
              <motion.span
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{
                  background:
                    step === s
                      ? 'linear-gradient(135deg, rgba(255, 0, 255, 0.3), rgba(200, 0, 255, 0.2))'
                      : 'rgba(30, 50, 70, 0.5)',
                  border: step === s ? '2px solid rgba(255, 0, 255, 0.6)' : '1px solid rgba(100, 150, 200, 0.3)',
                  color: step === s ? '#ff00ff' : '#8090a0',
                }}
                animate={step === s ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {i + 1}
              </motion.span>
              <span className={`hidden md:inline text-sm ${step === s ? 'text-fuchsia-300' : 'text-cyan-200/50'}`}>
                {t(`steps.${s}`)}
              </span>
            </div>
          ))}
        </div>
        <HoloProgress value={currentStepIndex + 1} max={steps.length} variant="default" size="sm" />
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

      {/* Step content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Type */}
        {step === 'type' && (
          <motion.div
            key="type"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <HoloInput
              label={t('operationName')}
              value={operationName}
              onChange={(val) => setOperationName(val)}
              placeholder={t('operationNamePlaceholder')}
            />

            <div className="grid grid-cols-2 gap-4">
              {(['attack', 'defend'] as ACSOperationType[]).map((type) => (
                <motion.button
                  key={type}
                  onClick={() => setOperationType(type)}
                  className="p-4 rounded-lg transition-all"
                  style={{
                    background:
                      operationType === type
                        ? type === 'attack'
                          ? 'linear-gradient(135deg, rgba(255, 68, 68, 0.2), rgba(255, 50, 50, 0.1))'
                          : 'linear-gradient(135deg, rgba(0, 136, 255, 0.2), rgba(0, 100, 200, 0.1))'
                        : 'rgba(20, 40, 60, 0.5)',
                    border:
                      operationType === type
                        ? type === 'attack'
                          ? '1px solid rgba(255, 68, 68, 0.5)'
                          : '1px solid rgba(0, 136, 255, 0.5)'
                        : '1px solid rgba(100, 150, 200, 0.2)',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center"
                    style={{
                      background:
                        type === 'attack'
                          ? 'rgba(255, 68, 68, 0.2)'
                          : 'rgba(0, 136, 255, 0.2)',
                    }}
                  >
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={type === 'attack' ? '#ff4444' : '#0088ff'}
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={
                          type === 'attack'
                            ? 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z'
                            : 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
                        }
                      />
                    </svg>
                  </div>
                  <div
                    className="font-medium"
                    style={{ color: type === 'attack' ? '#ff4444' : '#0088ff' }}
                  >
                    {t(`type.${type}`)}
                  </div>
                  <div className="text-xs text-cyan-200/50 mt-1">{t(`typeDesc.${type}`)}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Target */}
        {step === 'target' && (
          <motion.div
            key="target"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-4">
              <HoloInput
                label={t('galaxy')}
                type="number"
                min={1}
                max={9}
                value={targetGalaxy}
                onChange={(val) => setTargetGalaxy(parseInt(val) || 1)}
              />
              <HoloInput
                label={t('system')}
                type="number"
                min={1}
                max={499}
                value={targetSystem}
                onChange={(val) => setTargetSystem(parseInt(val) || 1)}
              />
              <HoloInput
                label={t('position')}
                type="number"
                min={1}
                max={15}
                value={targetPosition}
                onChange={(val) => setTargetPosition(parseInt(val) || 1)}
              />
            </div>

            <div>
              <label className="block text-cyan-200/70 text-sm mb-2">{t('targetType')}</label>
              <div className="flex gap-2">
                <HoloButton
                  onClick={() => setTargetType('planet')}
                  variant={targetType === 'planet' ? 'primary' : 'ghost'}
                  size="sm"
                >
                  {t('planet')}
                </HoloButton>
                <HoloButton
                  onClick={() => setTargetType('moon')}
                  variant={targetType === 'moon' ? 'primary' : 'ghost'}
                  size="sm"
                >
                  {t('moon')}
                </HoloButton>
              </div>
            </div>

            <div>
              <label className="block text-cyan-200/70 text-sm mb-2">
                {t('speed')}: {speedPercent}%
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

            {flightInfo && (
              <div
                className="p-3 rounded-lg"
                style={{
                  background: 'rgba(255, 0, 255, 0.05)',
                  border: '1px solid rgba(255, 0, 255, 0.2)',
                }}
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-fuchsia-200/60">{t('distance')}:</span>
                    <span className="text-fuchsia-300 ml-2 font-mono">
                      {formatNumber(flightInfo.distance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-fuchsia-200/60">{t('duration')}:</span>
                    <span className="text-fuchsia-300 ml-2 font-mono">
                      {formatDuration(flightInfo.duration)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Fleet */}
        {step === 'fleet' && (
          <motion.div
            key="fleet"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
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

            <div className="max-h-64 overflow-y-auto space-y-2">
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
                        className="w-10 h-10 rounded border border-cyan-500/30"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <div>
                        <div className="text-cyan-200">{ship.name}</div>
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
                      className="w-24"
                    />
                  </div>
                )
              })}

              {availableShips.length === 0 && (
                <div className="text-center text-cyan-200/50 py-8">{t('noShipsAvailable')}</div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20">
              <span className="text-cyan-200/60">{t('totalShips')}:</span>
              <span className="text-cyan-300 font-mono">{totalSelectedShips}</span>
            </div>

            {flightInfo && (
              <div className="flex items-center justify-between">
                <span className="text-cyan-200/60">{t('fuelCost')}:</span>
                <span
                  className={`font-mono ${
                    flightInfo.fuel > (currentPlanet?.deuterium || 0)
                      ? 'text-red-400'
                      : 'text-green-400'
                  }`}
                >
                  {formatNumber(flightInfo.fuel)}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 4: Invite */}
        {step === 'invite' && (
          <motion.div
            key="invite"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-200/70 text-sm">{t('inviteMembers')}</span>
              <HoloBadge variant="purple">
                {selectedMembers.length}/{ACS_MAX_PARTICIPANTS - 1}
              </HoloBadge>
            </div>

            {allianceMembers.length === 0 ? (
              <div className="text-center text-cyan-200/50 py-8">{t('noAllianceMembers')}</div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {allianceMembers.map((member) => {
                  const isSelected = selectedMembers.includes(member.id)

                  return (
                    <motion.button
                      key={member.id}
                      onClick={() => toggleMemberSelection(member.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg transition-all"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(255, 0, 255, 0.15), rgba(200, 0, 255, 0.1))'
                          : 'rgba(10, 25, 40, 0.5)',
                        border: isSelected
                          ? '1px solid rgba(255, 0, 255, 0.4)'
                          : '1px solid rgba(0, 255, 255, 0.1)',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                          style={{
                            background: isSelected
                              ? 'rgba(255, 0, 255, 0.2)'
                              : 'rgba(0, 255, 255, 0.1)',
                            border: isSelected
                              ? '1px solid rgba(255, 0, 255, 0.4)'
                              : '1px solid rgba(0, 255, 255, 0.2)',
                            color: isSelected ? '#ff00ff' : '#00ffff',
                          }}
                        >
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <span className={isSelected ? 'text-fuchsia-300' : 'text-cyan-200'}>
                          {member.username}
                        </span>
                      </div>
                      {isSelected && (
                        <svg
                          className="w-5 h-5 text-fuchsia-400"
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
                      )}
                    </motion.button>
                  )
                })}
              </div>
            )}

            <p className="text-cyan-200/50 text-sm">{t('inviteNote')}</p>
          </motion.div>
        )}

        {/* Step 5: Confirm */}
        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(255, 0, 255, 0.05)',
                border: '1px solid rgba(255, 0, 255, 0.2)',
              }}
            >
              <h4 className="text-fuchsia-300 font-medium mb-3">{t('operationSummary')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-200/60">{t('name')}:</span>
                  <span className="text-fuchsia-300">{operationName || 'Unnamed Operation'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200/60">{t('type')}:</span>
                  <span
                    style={{ color: operationType === 'attack' ? '#ff4444' : '#0088ff' }}
                    className="capitalize"
                  >
                    {t(`type.${operationType}`)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200/60">{t('target')}:</span>
                  <span className="text-cyan-300 font-mono">
                    [{targetGalaxy}:{targetSystem}:{targetPosition}] ({targetType})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200/60">{t('totalShips')}:</span>
                  <span className="text-cyan-300 font-mono">{totalSelectedShips}</span>
                </div>
                {flightInfo && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-cyan-200/60">{t('arrivalTime')}:</span>
                      <span className="text-cyan-300 font-mono">
                        {flightInfo.arrivalTime.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-200/60">{t('fuelCost')}:</span>
                      <span className="text-green-400 font-mono">{formatNumber(flightInfo.fuel)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-cyan-200/60">{t('invitations')}:</span>
                  <span className="text-fuchsia-300">{selectedMembers.length}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <HoloButton onClick={goBack} variant="ghost" disabled={currentStepIndex === 0}>
          {tCommon('back')}
        </HoloButton>

        {step === 'confirm' ? (
          <HoloButton
            onClick={handleSubmit}
            variant="secondary"
            loading={isSubmitting}
            disabled={!canProceed}
          >
            {t('createOperation')}
          </HoloButton>
        ) : (
          <HoloButton onClick={goNext} variant="primary" disabled={!canProceed}>
            {tCommon('continue')}
          </HoloButton>
        )}
      </div>
    </HoloModal>
  )
}

export default CreateACSModal
