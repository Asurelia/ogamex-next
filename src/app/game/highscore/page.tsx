'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/game/formulas'

interface HighscoreEntry {
  rank: number
  user_id: string
  username: string
  alliance_tag: string | null
  total_points: number
  economy_points: number
  research_points: number
  military_points: number
}

type ScoreCategory = 'total' | 'economy' | 'research' | 'military'

export default function HighscorePage() {
  const { user } = useGameStore()
  const [scores, setScores] = useState<HighscoreEntry[]>([])
  const [category, setCategory] = useState<ScoreCategory>('total')
  const [loading, setLoading] = useState(true)
  const t = useTranslations('highscore')
  const tCommon = useTranslations('common')

  useEffect(() => {
    loadHighscores()
  }, [category])

  const loadHighscores = async () => {
    setLoading(true)
    const supabase = getSupabaseClient()

    const orderColumn = category === 'total' ? 'total_points'
      : category === 'economy' ? 'economy_points'
      : category === 'research' ? 'research_points'
      : 'military_points'

    const { data: highscores } = await supabase
      .from('highscores')
      .select(`
        *,
        users!inner(username, alliance_id, alliances(tag))
      `)
      .order(orderColumn, { ascending: false })
      .limit(100)

    if (highscores) {
      setScores(highscores.map((h: any, index: number) => ({
        rank: index + 1,
        user_id: h.user_id,
        username: h.users?.username || 'Unknown',
        alliance_tag: h.users?.alliances?.tag || null,
        total_points: h.total_points,
        economy_points: h.economy_points,
        research_points: h.research_points,
        military_points: h.military_points,
      })))
    }

    setLoading(false)
  }

  const categories: { id: ScoreCategory; label: string; icon: string }[] = [
    { id: 'total', label: t('categories.total'), icon: '🏆' },
    { id: 'economy', label: t('categories.economy'), icon: '💰' },
    { id: 'research', label: t('categories.research'), icon: '🔬' },
    { id: 'military', label: t('categories.military'), icon: '⚔️' },
  ]

  const getPointsForCategory = (entry: HighscoreEntry): number => {
    switch (category) {
      case 'economy': return entry.economy_points
      case 'research': return entry.research_points
      case 'military': return entry.military_points
      default: return entry.total_points
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm transition-colors ${
              category === cat.id
                ? 'bg-ogame-accent text-black font-semibold'
                : 'bg-ogame-panel border border-ogame-border text-ogame-text-muted hover:text-ogame-text'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Highscore table */}
      <div className="ogame-panel">
        <div className="ogame-panel-content p-0">
          {loading ? (
            <p className="text-ogame-text-muted text-center py-8">{tCommon('loading')}</p>
          ) : (
            <table className="ogame-table">
              <thead>
                <tr>
                  <th className="w-16 text-center">{t('rank')}</th>
                  <th>{t('player')}</th>
                  <th>{t('alliance')}</th>
                  <th className="text-right">{t('points')}</th>
                </tr>
              </thead>
              <tbody>
                {scores.map(entry => (
                  <tr
                    key={entry.user_id}
                    className={entry.user_id === user?.id ? 'bg-ogame-accent/10' : ''}
                  >
                    <td className="text-center font-mono">
                      {entry.rank <= 3 ? (
                        <span className="text-lg">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        entry.rank
                      )}
                    </td>
                    <td>
                      <span className={entry.user_id === user?.id ? 'text-ogame-accent font-semibold' : 'text-ogame-text-header'}>
                        {entry.username}
                      </span>
                    </td>
                    <td>
                      {entry.alliance_tag ? (
                        <span className="ogame-badge ogame-badge-info">{entry.alliance_tag}</span>
                      ) : (
                        <span className="text-ogame-text-muted">-</span>
                      )}
                    </td>
                    <td className="text-right font-mono text-ogame-accent">
                      {formatNumber(getPointsForCategory(entry))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
