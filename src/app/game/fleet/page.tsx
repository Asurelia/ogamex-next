'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { useACSStore } from '@/stores/acsStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  formatNumber,
  formatDuration,
  calculateDistance,
  calculateFleetDuration,
  getSlowestShipSpeed,
  calculateFuelConsumption
} from '@/game/formulas'
import { SHIPS } from '@/game/constants'
import {
  HoloCard,
  HoloButton,
  HoloTable,
  HoloInput,
  HoloTabs,
  HoloStats,
  HoloCountdown,
  HoloProgress
} from '@/components/ui'
import { ACSPanel, CreateACSModal, JoinACSModal } from '@/components/game/fleet'
import { motion, AnimatePresence } from 'framer-motion'
import type { MissionType } from '@/types/database'
import type { CreateACSOperationParams, JoinACSParams } from '@/types/acs'

type FleetStep = 'select' | 'destination' | 'mission' | 'confirm'

interface ShipSelectionRow {
  id: number
  key: string
  name: string
  available: number
  selected: number
}

export default function FleetPage() {
  const { currentPlanet, fleetMissions, setFleetMissions, updatePlanetResources, research, user } = useGameStore()
  const {
    currentOperations,
    invitations,
    isCreateModalOpen,
    openCreateModal,
    closeCreateModal,
    isJoinModalOpen,
    joinOperationId,
    openJoinModal,
    closeJoinModal,
  } = useACSStore()
  const [step, setStep] = useState<FleetStep>('select')
  const [selectedShips, setSelectedShips] = useState<Record<number, number>>({})
  const [destination, setDestination] = useState({ galaxy: 1, system: 1, position: 1, type: 'planet' as 'planet' | 'moon' })
  const [missionType, setMissionType] = useState<string>('transport')
  const [resources, setResources] = useState({ metal: 0, crystal: 0, deuterium: 0 })
  const [speed, setSpeed] = useState(100)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState('dispatch')
  const t = useTranslations('fleet')
  const tRes = useTranslations('resources')
  const tCommon = useTranslations('common')

  // Check if user has alliance (mock for now)
  const hasAlliance = Boolean(user?.alliance_id)

  // Handle ACS operation creation
  const handleCreateACSOperation = useCallback(async (params: CreateACSOperationParams) => {
    // TODO: Implement actual API call
    console.log('Creating ACS operation:', params)
    // For now, just close the modal
    closeCreateModal()
  }, [closeCreateModal])

  // Handle joining an ACS operation
  const handleJoinACSOperation = useCallback((operationId: string) => {
    openJoinModal(operationId)
  }, [openJoinModal])

  // Handle actual join submission
  const handleSubmitJoinACS = useCallback(async (params: JoinACSParams) => {
    // TODO: Implement actual API call
    console.log('Joining ACS operation:', params)
    closeJoinModal()
  }, [closeJoinModal])

  // Get the operation to join
  const operationToJoin = joinOperationId
    ? currentOperations.find((op) => op.id === joinOperationId) || null
    : null

  if (!currentPlanet) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="text-cyan-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {tCommon('loading')}
        </motion.div>
      </div>
    )
  }

  const getShipCount = (key: string): number => {
    return (currentPlanet as unknown as Record<string, number>)[key] || 0
  }

  const ships = Object.values(SHIPS)
  const availableShips = ships.filter(ship => getShipCount(ship.key) > 0)

  const totalSelected = Object.values(selectedShips).reduce((a, b) => a + b, 0)

  const handleShipChange = (shipId: number, value: number, max: number) => {
    setSelectedShips({
      ...selectedShips,
      [shipId]: Math.max(0, Math.min(value, max)),
    })
  }

  const selectAll = () => {
    const all: Record<number, number> = {}
    ships.forEach(ship => {
      const count = getShipCount(ship.key)
      if (count > 0) all[ship.id] = count
    })
    setSelectedShips(all)
  }

  const selectNone = () => {
    setSelectedShips({})
  }

  const missions = [
    { id: 'attack', label: t('missions.attack'), icon: '1' },
    { id: 'transport', label: t('missions.transport'), icon: '3' },
    { id: 'deployment', label: t('missions.deployment'), icon: '4' },
    { id: 'espionage', label: t('missions.espionage'), icon: '6' },
    { id: 'colonization', label: t('missions.colonization'), icon: '7' },
    { id: 'recycle', label: t('missions.recycle'), icon: '8' },
    { id: 'expedition', label: t('missions.expedition'), icon: '15' },
  ]

  const getFleetInfo = () => {
    const shipsArray = Object.entries(selectedShips)
      .filter(([_, amount]) => amount > 0)
      .map(([shipId, amount]) => ({ shipId: parseInt(shipId), amount }))

    if (shipsArray.length === 0) return null

    const combustionLevel = research?.combustion_drive ?? 0
    const impulseLevel = research?.impulse_drive ?? 0
    const hyperspaceLevel = research?.hyperspace_drive ?? 0

    const distance = calculateDistance(
      currentPlanet.galaxy, currentPlanet.system, currentPlanet.position,
      destination.galaxy, destination.system, destination.position
    )

    const slowestSpeed = getSlowestShipSpeed(shipsArray, combustionLevel, impulseLevel, hyperspaceLevel)
    const duration = calculateFleetDuration(distance, slowestSpeed, speed, 1)
    const fuel = calculateFuelConsumption(shipsArray, distance, duration, speed)

    return { distance, duration, fuel }
  }

  const sendFleet = async () => {
    if (!currentPlanet || !user) return

    setError(null)
    setSending(true)

    try {
      const supabase = getSupabaseClient()

      const shipsArray = Object.entries(selectedShips)
        .filter(([_, amount]) => amount > 0)
        .map(([shipId, amount]) => ({ shipId: parseInt(shipId), amount }))

      if (shipsArray.length === 0) {
        throw new Error('No ships selected')
      }

      const combustionLevel = research?.combustion_drive ?? 0
      const impulseLevel = research?.impulse_drive ?? 0
      const hyperspaceLevel = research?.hyperspace_drive ?? 0

      const distance = calculateDistance(
        currentPlanet.galaxy, currentPlanet.system, currentPlanet.position,
        destination.galaxy, destination.system, destination.position
      )

      const slowestSpeed = getSlowestShipSpeed(shipsArray, combustionLevel, impulseLevel, hyperspaceLevel)
      const duration = calculateFleetDuration(distance, slowestSpeed, speed, 1)
      const fuelCost = calculateFuelConsumption(shipsArray, distance, duration, speed)

      const totalDeuteriumNeeded = (missionType === 'transport' || missionType === 'deployment')
        ? resources.deuterium + fuelCost
        : fuelCost

      if (totalDeuteriumNeeded > currentPlanet.deuterium) {
        throw new Error(`Not enough deuterium. Need ${totalDeuteriumNeeded}, have ${currentPlanet.deuterium}`)
      }

      const shipCounts: Record<string, number> = {}
      Object.values(SHIPS).forEach(ship => {
        shipCounts[ship.key] = selectedShips[ship.id] || 0
      })

      const now = new Date()
      const arrivesAt = new Date(now.getTime() + duration * 1000)
      const returnsAt = missionType !== 'deployment'
        ? new Date(now.getTime() + duration * 2 * 1000)
        : null

      const { data: newMission, error: insertError } = await supabase
        .from('fleet_missions')
        .insert({
          user_id: user.id,
          origin_planet_id: currentPlanet.id,
          origin_galaxy: currentPlanet.galaxy,
          origin_system: currentPlanet.system,
          origin_position: currentPlanet.position,
          destination_galaxy: destination.galaxy,
          destination_system: destination.system,
          destination_position: destination.position,
          destination_type: destination.type,
          mission_type: missionType as MissionType,
          light_fighter: shipCounts.light_fighter || 0,
          heavy_fighter: shipCounts.heavy_fighter || 0,
          cruiser: shipCounts.cruiser || 0,
          battleship: shipCounts.battleship || 0,
          battlecruiser: shipCounts.battlecruiser || 0,
          bomber: shipCounts.bomber || 0,
          destroyer: shipCounts.destroyer || 0,
          deathstar: shipCounts.deathstar || 0,
          small_cargo: shipCounts.small_cargo || 0,
          large_cargo: shipCounts.large_cargo || 0,
          colony_ship: shipCounts.colony_ship || 0,
          recycler: shipCounts.recycler || 0,
          espionage_probe: shipCounts.espionage_probe || 0,
          reaper: shipCounts.reaper || 0,
          pathfinder: shipCounts.pathfinder || 0,
          metal: (missionType === 'transport' || missionType === 'deployment') ? resources.metal : 0,
          crystal: (missionType === 'transport' || missionType === 'deployment') ? resources.crystal : 0,
          deuterium: (missionType === 'transport' || missionType === 'deployment') ? resources.deuterium : 0,
          departed_at: now.toISOString(),
          arrives_at: arrivesAt.toISOString(),
          returns_at: returnsAt?.toISOString() ?? null,
          is_returning: false,
          processed: false,
          cancelled: false,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const planetUpdates: Record<string, number> = {}

      Object.values(SHIPS).forEach(ship => {
        const amount = selectedShips[ship.id] || 0
        if (amount > 0) {
          planetUpdates[ship.key] = getShipCount(ship.key) - amount
        }
      })

      planetUpdates.deuterium = currentPlanet.deuterium - fuelCost
      if (missionType === 'transport' || missionType === 'deployment') {
        planetUpdates.metal = currentPlanet.metal - resources.metal
        planetUpdates.crystal = currentPlanet.crystal - resources.crystal
        planetUpdates.deuterium -= resources.deuterium
      }

      const { error: updateError } = await supabase
        .from('player_colonies')
        .update(planetUpdates)
        .eq('id', currentPlanet.id)

      if (updateError) throw updateError

      updatePlanetResources(currentPlanet.id, planetUpdates)
      setFleetMissions([...fleetMissions, newMission])

      setSelectedShips({})
      setResources({ metal: 0, crystal: 0, deuterium: 0 })
      setStep('select')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send fleet')
    } finally {
      setSending(false)
    }
  }

  // Fleet stats
  const fleetStats = [
    { label: t('fleetSlots'), value: `${fleetMissions.length}/10`, color: fleetMissions.length >= 10 ? '#ff4444' : '#00ffff' },
    { label: t('shipsSelected'), value: totalSelected, color: totalSelected > 0 ? '#00ff88' : '#00ffff' },
  ]

  // Pending ACS invitations count
  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending')
  const activeACSOperations = currentOperations.filter(
    (op) => op.status !== 'completed' && op.status !== 'cancelled'
  )

  // View tabs
  const viewTabs = [
    { id: 'dispatch', label: t('dispatch'), badge: totalSelected > 0 ? totalSelected : undefined },
    { id: 'missions', label: t('activeMissionsTitle'), badge: fleetMissions.length > 0 ? fleetMissions.length : undefined },
    {
      id: 'acs',
      label: t('acs.tabTitle') || 'ACS',
      badge: (activeACSOperations.length + pendingInvitations.length) > 0
        ? activeACSOperations.length + pendingInvitations.length
        : undefined,
    },
  ]

  // Prepare table data for ship selection
  const shipTableData: ShipSelectionRow[] = availableShips.map(ship => ({
    id: ship.id,
    key: ship.key,
    name: ship.name,
    available: getShipCount(ship.key),
    selected: selectedShips[ship.id] || 0,
  }))

  const shipTableColumns = [
    {
      key: 'name' as keyof ShipSelectionRow,
      header: t('ship'),
      render: (value: ShipSelectionRow[keyof ShipSelectionRow], row: ShipSelectionRow) => (
        <div className="flex items-center gap-2">
          <img
            src={`/img/objects/units/${row.key}_small.jpg`}
            alt={String(value)}
            className="w-8 h-8 rounded border border-cyan-500/30"
          />
          <span>{String(value)}</span>
        </div>
      ),
    },
    {
      key: 'available' as keyof ShipSelectionRow,
      header: t('available'),
      render: (value: ShipSelectionRow[keyof ShipSelectionRow]) => (
        <span className="font-mono text-cyan-300">{Number(value)}</span>
      ),
    },
    {
      key: 'selected' as keyof ShipSelectionRow,
      header: t('selected'),
      render: (_value: ShipSelectionRow[keyof ShipSelectionRow], row: ShipSelectionRow) => (
        <HoloInput
          type="number"
          min={0}
          max={row.available}
          value={selectedShips[row.id] || ''}
          onChange={(val) => handleShipChange(row.id, parseInt(val) || 0, row.available)}
          className="w-20"
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <h1
          className="text-2xl font-bold"
          style={{ color: '#00ffff', textShadow: '0 0 20px rgba(0, 255, 255, 0.5)' }}
        >
          {t('title')}
        </h1>
        <HoloStats stats={fleetStats} columns={2} />
      </motion.div>

      {/* View tabs */}
      <HoloTabs
        tabs={viewTabs}
        activeTab={activeView}
        onChange={setActiveView}
        variant="pills"
      />

      {/* Dispatch view */}
      <AnimatePresence mode="wait">
        {activeView === 'dispatch' && (
          <motion.div
            key="dispatch"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Step indicator */}
            <HoloCard glow>
              <div className="p-4">
                <div className="flex justify-between items-center">
                  {(['select', 'destination', 'mission', 'confirm'] as FleetStep[]).map((s, i) => (
                    <div
                      key={s}
                      className={`flex items-center gap-2 cursor-pointer transition-all ${
                        step === s ? 'opacity-100' : 'opacity-40'
                      }`}
                      onClick={() => {
                        const currentIndex = ['select', 'destination', 'mission', 'confirm'].indexOf(step)
                        if (i <= currentIndex) {
                          setStep(s)
                        }
                      }}
                    >
                      <motion.span
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                        style={{
                          background: step === s
                            ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 150, 255, 0.2))'
                            : 'rgba(30, 50, 70, 0.5)',
                          border: step === s
                            ? '2px solid rgba(0, 255, 255, 0.6)'
                            : '1px solid rgba(100, 150, 200, 0.3)',
                          color: step === s ? '#00ffff' : '#8090a0',
                        }}
                        animate={step === s ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        {i + 1}
                      </motion.span>
                      <span className={`hidden sm:inline ${step === s ? 'text-cyan-300' : 'text-cyan-200/50'}`}>
                        {s === 'select' ? t('selectShips') : s === 'destination' ? t('destination') : s === 'mission' ? t('missionType') : t('confirmMission')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </HoloCard>

            {/* Step 1: Select ships */}
            {step === 'select' && (
              <HoloCard glow>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-cyan-300">{t('selectShips')}</h2>
                    <div className="flex gap-2">
                      <HoloButton onClick={selectAll} size="sm" variant="ghost">{tCommon('all')}</HoloButton>
                      <HoloButton onClick={selectNone} size="sm" variant="ghost">{tCommon('none')}</HoloButton>
                    </div>
                  </div>

                  {availableShips.length === 0 ? (
                    <p className="text-cyan-200/50 text-center py-8">{t('noShips')}</p>
                  ) : (
                    <HoloTable
                      columns={shipTableColumns}
                      data={shipTableData}
                    />
                  )}

                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-cyan-200/60">
                      {t('selected')}: <span className="text-cyan-300 font-mono">{totalSelected}</span> {t('ships')}
                    </span>
                    <HoloButton
                      onClick={() => setStep('destination')}
                      disabled={totalSelected === 0}
                    >
                      {tCommon('continue')}
                    </HoloButton>
                  </div>
                </div>
              </HoloCard>
            )}

            {/* Step 2: Destination */}
            {step === 'destination' && (
              <HoloCard glow>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-cyan-300 mb-4">{t('destination')}</h2>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <HoloInput
                      label={t('galaxy')}
                      type="number"
                      min={1}
                      max={9}
                      value={destination.galaxy}
                      onChange={(val) => setDestination({ ...destination, galaxy: parseInt(val) || 1 })}
                    />
                    <HoloInput
                      label={t('system')}
                      type="number"
                      min={1}
                      max={499}
                      value={destination.system}
                      onChange={(val) => setDestination({ ...destination, system: parseInt(val) || 1 })}
                    />
                    <HoloInput
                      label={t('position')}
                      type="number"
                      min={1}
                      max={15}
                      value={destination.position}
                      onChange={(val) => setDestination({ ...destination, position: parseInt(val) || 1 })}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-cyan-200/70 text-sm mb-2">{t('targetType')}</label>
                    <div className="flex gap-2">
                      <HoloButton
                        onClick={() => setDestination({ ...destination, type: 'planet' })}
                        variant={destination.type === 'planet' ? 'primary' : 'ghost'}
                        size="sm"
                      >
                        {t('planet')}
                      </HoloButton>
                      <HoloButton
                        onClick={() => setDestination({ ...destination, type: 'moon' })}
                        variant={destination.type === 'moon' ? 'primary' : 'ghost'}
                        size="sm"
                      >
                        {t('moon')}
                      </HoloButton>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-cyan-200/70 text-sm mb-2">{t('speed')}: {speed}%</label>
                    <HoloProgress value={speed} max={100} variant="health" size="lg" />
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={speed}
                      onChange={(e) => setSpeed(parseInt(e.target.value))}
                      className="w-full mt-2 accent-cyan-400"
                    />
                  </div>

                  <div className="flex justify-between">
                    <HoloButton onClick={() => setStep('select')} variant="ghost">
                      {tCommon('back')}
                    </HoloButton>
                    <HoloButton onClick={() => setStep('mission')}>
                      {tCommon('continue')}
                    </HoloButton>
                  </div>
                </div>
              </HoloCard>
            )}

            {/* Step 3: Mission */}
            {step === 'mission' && (
              <HoloCard glow>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-cyan-300 mb-4">{t('missionType')}</h2>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {missions.map(m => (
                      <motion.button
                        key={m.id}
                        onClick={() => setMissionType(m.id)}
                        className="p-4 rounded-lg transition-all"
                        style={{
                          background: missionType === m.id
                            ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 150, 255, 0.1))'
                            : 'rgba(20, 40, 60, 0.5)',
                          border: missionType === m.id
                            ? '1px solid rgba(0, 255, 255, 0.5)'
                            : '1px solid rgba(100, 150, 200, 0.2)',
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <img
                          src={`/img/fleet/${m.icon}.gif`}
                          alt={m.label}
                          className="w-8 h-8 mx-auto mb-2"
                        />
                        <div className={`text-sm ${missionType === m.id ? 'text-cyan-300' : 'text-cyan-200/60'}`}>
                          {m.label}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Resources to send */}
                  {(missionType === 'transport' || missionType === 'deployment') && (
                    <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(20, 40, 60, 0.5)', border: '1px solid rgba(100, 150, 200, 0.2)' }}>
                      <h3 className="text-cyan-300 mb-3">{t('resourcesToSend')}</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <HoloInput
                          label={tRes('metal')}
                          type="number"
                          min={0}
                          max={currentPlanet.metal}
                          value={resources.metal}
                          onChange={(val) => setResources({ ...resources, metal: parseInt(val) || 0 })}
                        />
                        <HoloInput
                          label={tRes('crystal')}
                          type="number"
                          min={0}
                          max={currentPlanet.crystal}
                          value={resources.crystal}
                          onChange={(val) => setResources({ ...resources, crystal: parseInt(val) || 0 })}
                        />
                        <HoloInput
                          label={tRes('deuterium')}
                          type="number"
                          min={0}
                          max={currentPlanet.deuterium}
                          value={resources.deuterium}
                          onChange={(val) => setResources({ ...resources, deuterium: parseInt(val) || 0 })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <HoloButton onClick={() => setStep('destination')} variant="ghost">
                      {tCommon('back')}
                    </HoloButton>
                    <HoloButton onClick={() => setStep('confirm')}>
                      {tCommon('continue')}
                    </HoloButton>
                  </div>
                </div>
              </HoloCard>
            )}

            {/* Step 4: Confirm */}
            {step === 'confirm' && (() => {
              const fleetInfo = getFleetInfo()
              return (
                <HoloCard variant="accent" glow>
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-cyan-300 mb-4">{t('confirmMission')}</h2>

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

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-cyan-200/60">{t('mission')}:</span>
                        <span className="text-cyan-300 capitalize">{missionType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-200/60">{t('destination')}:</span>
                        <span className="text-cyan-300">
                          [{destination.galaxy}:{destination.system}:{destination.position}] ({destination.type})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-200/60">{t('ships')}:</span>
                        <span className="text-cyan-300">{totalSelected}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-200/60">{t('speed')}:</span>
                        <span className="text-cyan-300">{speed}%</span>
                      </div>
                      {fleetInfo && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-cyan-200/60">{t('distance')}:</span>
                            <span className="text-cyan-300 font-mono">{formatNumber(fleetInfo.distance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-200/60">{t('duration')}:</span>
                            <span className="text-cyan-300 font-mono">{formatDuration(fleetInfo.duration)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-200/60">{t('fuel')}:</span>
                            <span className={`font-mono ${fleetInfo.fuel > currentPlanet.deuterium ? 'text-red-400' : 'text-green-400'}`}>
                              {formatNumber(fleetInfo.fuel)}
                            </span>
                          </div>
                        </>
                      )}
                      {(missionType === 'transport' || missionType === 'deployment') && (resources.metal > 0 || resources.crystal > 0 || resources.deuterium > 0) && (
                        <div className="pt-3 border-t border-cyan-500/20">
                          <div className="text-cyan-200/60 mb-2">{tRes('resources')}:</div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-300">{formatNumber(resources.metal)} M</span>
                            <span className="text-blue-300">{formatNumber(resources.crystal)} C</span>
                            <span className="text-green-300">{formatNumber(resources.deuterium)} D</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex justify-between">
                      <HoloButton onClick={() => setStep('mission')} variant="ghost" disabled={sending}>
                        {tCommon('back')}
                      </HoloButton>
                      <HoloButton
                        onClick={sendFleet}
                        disabled={sending || !fleetInfo || fleetInfo.fuel > currentPlanet.deuterium}
                        loading={sending}
                        variant="primary"
                      >
                        {t('sendFleet')}
                      </HoloButton>
                    </div>
                  </div>
                </HoloCard>
              )
            })()}
          </motion.div>
        )}

        {/* Missions view */}
        {activeView === 'missions' && (
          <motion.div
            key="missions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <HoloCard glow>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-cyan-300 mb-4">{t('activeMissionsTitle')}</h2>

                {fleetMissions.length === 0 ? (
                  <div className="text-center text-cyan-200/50 py-8">
                    {t('noActiveMissions')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fleetMissions.map(fm => {
                      const arrivesAt = new Date(fm.arrives_at)

                      return (
                        <motion.div
                          key={fm.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-lg"
                          style={{
                            background: 'linear-gradient(135deg, rgba(20, 40, 60, 0.8), rgba(10, 25, 40, 0.9))',
                            border: `1px solid ${fm.is_returning ? 'rgba(255, 200, 0, 0.3)' : 'rgba(0, 255, 255, 0.3)'}`,
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-cyan-300 font-medium capitalize">
                                {t(`missions.${fm.mission_type}`)}
                              </span>
                              <span className="text-cyan-200/50 mx-2">to</span>
                              <span className="text-cyan-200/80">
                                [{fm.destination_galaxy}:{fm.destination_system}:{fm.destination_position}]
                              </span>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                fm.is_returning
                                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              }`}
                            >
                              {fm.is_returning ? t('returning') : t('outbound')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-cyan-200/50 text-sm">{t('arrivesIn')}:</span>
                            <HoloCountdown targetDate={arrivesAt} format="compact" showLabels={false} />
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </HoloCard>
          </motion.div>
        )}

        {/* ACS view */}
        {activeView === 'acs' && (
          <motion.div
            key="acs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ACSPanel
              currentOperations={currentOperations}
              invitations={invitations}
              onCreateOperation={openCreateModal}
              onJoinOperation={handleJoinACSOperation}
              hasAlliance={hasAlliance}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACS Create Modal */}
      <CreateACSModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateACSOperation}
        allianceMembers={[]} // TODO: Pass actual alliance members
      />

      {/* ACS Join Modal */}
      <JoinACSModal
        isOpen={isJoinModalOpen}
        onClose={closeJoinModal}
        operation={operationToJoin}
        onSubmit={handleSubmitJoinACS}
      />
    </div>
  )
}
