'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'

interface GalaxyPosition {
  position: number
  planet_id: string | null
  planet_name: string | null
  planet_type: string | null
  user_id: string | null
  username: string | null
  alliance_tag: string | null
  has_moon: boolean
  debris_metal: number
  debris_crystal: number
}

export default function GalaxyPage() {
  const { currentPlanet } = useGameStore()
  const [galaxy, setGalaxy] = useState(currentPlanet?.galaxy || 1)
  const [system, setSystem] = useState(currentPlanet?.system || 1)
  const [positions, setPositions] = useState<GalaxyPosition[]>([])
  const [loading, setLoading] = useState(false)
  const t = useTranslations('galaxy')
  const tCommon = useTranslations('common')

  useEffect(() => {
    loadGalaxyView()
  }, [galaxy, system])

  const loadGalaxyView = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()

      // Get planets in this system
      const { data: planets } = await supabase
        .from('planets')
        .select(`
          id,
          name,
          position,
          planet_type,
          user_id,
          users!inner(username, alliances(tag))
        `)
        .eq('galaxy', galaxy)
        .eq('system', system)
        .eq('destroyed', false)

      // Get debris fields
      const { data: debris } = await supabase
        .from('debris_fields')
        .select('position, metal, crystal')
        .eq('galaxy', galaxy)
        .eq('system', system)

      // Build position array (1-15)
      const positionData: GalaxyPosition[] = []
      for (let pos = 1; pos <= 15; pos++) {
        const planet = planets?.find((p: any) => p.position === pos)
        const debrisField = debris?.find((d: any) => d.position === pos)

        positionData.push({
          position: pos,
          planet_id: planet?.id || null,
          planet_name: planet?.name || null,
          planet_type: planet?.planet_type || null,
          user_id: planet?.user_id || null,
          username: (planet?.users as any)?.username || null,
          alliance_tag: (planet?.users as any)?.alliances?.tag || null,
          has_moon: false, // TODO: Check for moons
          debris_metal: debrisField?.metal || 0,
          debris_crystal: debrisField?.crystal || 0,
        })
      }

      setPositions(positionData)
    } catch (error) {
      console.error('Failed to load galaxy view:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateSystem = (delta: number) => {
    let newSystem = system + delta
    let newGalaxy = galaxy

    if (newSystem < 1) {
      newSystem = 499
      newGalaxy = galaxy - 1
      if (newGalaxy < 1) newGalaxy = 9
    } else if (newSystem > 499) {
      newSystem = 1
      newGalaxy = galaxy + 1
      if (newGalaxy > 9) newGalaxy = 1
    }

    setSystem(newSystem)
    setGalaxy(newGalaxy)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>
      </div>

      {/* Navigation */}
      <div className="ogame-panel">
        <div className="ogame-panel-content">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-ogame-text-muted">{t('galaxy')}:</span>
              <button onClick={() => setGalaxy(Math.max(1, galaxy - 1))} className="ogame-button px-2 py-1">&lt;</button>
              <input
                type="number"
                min="1"
                max="9"
                value={galaxy}
                onChange={(e) => setGalaxy(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
                className="ogame-input w-16 text-center"
              />
              <button onClick={() => setGalaxy(Math.min(9, galaxy + 1))} className="ogame-button px-2 py-1">&gt;</button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-ogame-text-muted">{t('system')}:</span>
              <button onClick={() => navigateSystem(-1)} className="ogame-button px-2 py-1">&lt;</button>
              <input
                type="number"
                min="1"
                max="499"
                value={system}
                onChange={(e) => setSystem(Math.max(1, Math.min(499, parseInt(e.target.value) || 1)))}
                className="ogame-input w-20 text-center"
              />
              <button onClick={() => navigateSystem(1)} className="ogame-button px-2 py-1">&gt;</button>
            </div>

            <button onClick={loadGalaxyView} className="ogame-button-primary">
              {loading ? tCommon('loading') : t('view')}
            </button>
          </div>
        </div>
      </div>

      {/* Galaxy table */}
      <div className="ogame-panel">
        <div className="ogame-panel-header">
          {t('solarSystem')} [{galaxy}:{system}]
        </div>
        <div className="ogame-panel-content p-0">
          <table className="ogame-table">
            <thead>
              <tr>
                <th className="w-12 text-center">{t('pos')}</th>
                <th>{t('planet')}</th>
                <th>{t('player')}</th>
                <th>{t('alliance')}</th>
                <th className="w-16 text-center">{t('moon')}</th>
                <th className="w-24 text-center">{t('debris')}</th>
                <th className="w-24 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.position} className={pos.planet_id ? '' : 'opacity-50'}>
                  <td className="text-center font-mono">{pos.position}</td>
                  <td>
                    {pos.planet_id ? (
                      <span className="text-ogame-text-header">{pos.planet_name}</span>
                    ) : (
                      <span className="text-ogame-text-muted">{t('empty')}</span>
                    )}
                  </td>
                  <td>
                    {pos.username ? (
                      <span className={pos.user_id === currentPlanet?.user_id ? 'text-ogame-positive' : 'ogame-link'}>
                        {pos.username}
                      </span>
                    ) : (
                      <span className="text-ogame-text-muted">-</span>
                    )}
                  </td>
                  <td>
                    {pos.alliance_tag ? (
                      <span className="ogame-badge ogame-badge-info">{pos.alliance_tag}</span>
                    ) : (
                      <span className="text-ogame-text-muted">-</span>
                    )}
                  </td>
                  <td className="text-center">
                    {pos.has_moon ? (
                      <img src="/img/moons/small/1.gif" alt="Moon" className="w-4 h-4 mx-auto" />
                    ) : '-'}
                  </td>
                  <td className="text-center">
                    {(pos.debris_metal > 0 || pos.debris_crystal > 0) ? (
                      <img
                        src="/img/fleet/8.gif"
                        alt="Debris"
                        title={`M: ${pos.debris_metal} C: ${pos.debris_crystal}`}
                        className="w-4 h-4 mx-auto"
                      />
                    ) : '-'}
                  </td>
                  <td className="text-center">
                    {pos.planet_id && pos.user_id !== currentPlanet?.user_id && (
                      <div className="flex justify-center gap-1">
                        <button className="text-xs ogame-button px-2 py-0.5" title="Spy">
                          <img src="/img/fleet/6.gif" alt="Spy" className="w-3 h-3 inline" />
                        </button>
                        <button className="text-xs ogame-button px-2 py-0.5" title="Attack">
                          <img src="/img/fleet/1.gif" alt="Attack" className="w-3 h-3 inline" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
