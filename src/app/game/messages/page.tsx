'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { BattlePreview } from '@/components/game/BattlePreview'
import type { Message } from '@/types/database'
import type { BattlePreviewData } from '@/types/battle'

type MessageCategory = 'all' | 'espionage' | 'battle' | 'transport' | 'expedition' | 'system'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract battle ID from message body if present
 * Battle messages contain a reference like "Battle Report ID: xxx"
 */
function extractBattleId(message: Message): string | null {
  if (message.type !== 'battle') return null

  // Try to extract battle_id from message body
  const match = message.body.match(/battle[_\s-]?(?:report[_\s-]?)?id[:\s]+([a-zA-Z0-9-]+)/i)
  if (match) return match[1]

  // Try sender_id as battle reference (some implementations store battle_id there)
  if (message.sender_id && message.sender_id.length > 10) {
    return message.sender_id
  }

  return null
}

/**
 * Parse battle data from message body
 */
function parseBattlePreview(message: Message, userId: string): BattlePreviewData | null {
  const battleId = extractBattleId(message)
  if (!battleId) return null

  // Parse coordinates from subject or body
  const coordMatch = message.body.match(/\[(\d+):(\d+):(\d+)\]/) ||
                     message.subject.match(/\[(\d+):(\d+):(\d+)\]/)
  const coordinates = coordMatch
    ? { galaxy: parseInt(coordMatch[1]), system: parseInt(coordMatch[2]), position: parseInt(coordMatch[3]) }
    : { galaxy: 1, system: 1, position: 1 }

  // Parse winner
  const winnerMatch = message.body.match(/(?:winner|victor|result)[:\s]*(attacker|defender|draw)/i)
  const winner = (winnerMatch?.[1]?.toLowerCase() as 'attacker' | 'defender' | 'draw') || 'draw'

  // Determine if user is attacker
  const isAttacker = message.body.toLowerCase().includes('you attacked') ||
                     message.body.toLowerCase().includes('your attack') ||
                     message.subject.toLowerCase().includes('attack on')

  // Parse opponent name
  const opponentMatch = message.body.match(/(?:against|vs\.?|opponent)[:\s]*([^\n\[\]]+)/i) ||
                        message.subject.match(/(?:vs\.?|against)[:\s]*([^\n\[\]]+)/i)
  const opponentName = opponentMatch?.[1]?.trim() || 'Unknown Player'

  // Parse losses (simplified)
  const attackerLossMatch = message.body.match(/attacker\s*(?:losses?|lost)[:\s]*(\d+(?:,\d+)*)/i)
  const defenderLossMatch = message.body.match(/defender\s*(?:losses?|lost)[:\s]*(\d+(?:,\d+)*)/i)
  const attackerLossValue = parseInt(attackerLossMatch?.[1]?.replace(/,/g, '') || '0')
  const defenderLossValue = parseInt(defenderLossMatch?.[1]?.replace(/,/g, '') || '0')

  // Parse debris
  const debrisMatch = message.body.match(/debris[:\s]*(\d+(?:,\d+)*)\s*(?:metal|m)[,\s]*(\d+(?:,\d+)*)\s*(?:crystal|c)/i)
  const debris = {
    metal: parseInt(debrisMatch?.[1]?.replace(/,/g, '') || '0'),
    crystal: parseInt(debrisMatch?.[2]?.replace(/,/g, '') || '0'),
  }

  // Parse loot
  const lootMatch = message.body.match(/loot(?:ed)?[:\s]*(\d+(?:,\d+)*)\s*m[,\s]*(\d+(?:,\d+)*)\s*c[,\s]*(\d+(?:,\d+)*)\s*d/i)
  const loot = lootMatch ? {
    metal: parseInt(lootMatch[1].replace(/,/g, '')),
    crystal: parseInt(lootMatch[2].replace(/,/g, '')),
    deuterium: parseInt(lootMatch[3].replace(/,/g, '')),
  } : undefined

  // Check for moon creation
  const moonCreated = message.body.toLowerCase().includes('moon') &&
                      (message.body.toLowerCase().includes('created') || message.body.toLowerCase().includes('formed'))

  return {
    id: battleId,
    timestamp: new Date(message.created_at),
    coordinates,
    winner,
    isAttacker,
    opponentName,
    attackerLossValue,
    defenderLossValue,
    debris,
    loot,
    moonCreated,
  }
}

// ============================================================================
// MESSAGE ITEM COMPONENT
// ============================================================================

interface MessageItemProps {
  message: Message
  isSelected: boolean
  onSelect: () => void
  battlePreview: BattlePreviewData | null
}

function MessageItem({ message, isSelected, onSelect, battlePreview }: MessageItemProps) {
  const isBattle = message.type === 'battle'

  return (
    <div
      onClick={onSelect}
      className={`p-3 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-ogame-accent/10'
          : 'hover:bg-ogame-border/30'
      } ${!message.read ? 'border-l-2 border-ogame-accent' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          {isBattle && (
            <span className="w-6 h-6 flex items-center justify-center rounded bg-red-900/50 text-red-400 text-xs">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L9 9H2l6 4-2 7 6-4 6 4-2-7 6-4h-7l-3-7z" />
              </svg>
            </span>
          )}
          <h4 className={`text-sm ${!message.read ? 'text-ogame-text-header font-semibold' : 'text-ogame-text-muted'}`}>
            {message.subject}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {isBattle && battlePreview && (
            <Link
              href={`/game/battle/${battlePreview.id}`}
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 rounded text-cyan-300 text-xs transition-colors"
            >
              View 3D
            </Link>
          )}
          <span className="text-xs text-ogame-text-muted">
            {new Date(message.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <p className="text-xs text-ogame-text-muted mt-1 truncate">
        {message.body.substring(0, 100)}
      </p>

      {/* Quick battle stats for battle messages */}
      {isBattle && battlePreview && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className={`px-2 py-0.5 rounded ${
            battlePreview.winner === 'attacker'
              ? battlePreview.isAttacker ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
              : battlePreview.winner === 'defender'
              ? battlePreview.isAttacker ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'
              : 'bg-yellow-900/50 text-yellow-400'
          }`}>
            {battlePreview.winner === 'attacker'
              ? battlePreview.isAttacker ? 'Victory' : 'Defeat'
              : battlePreview.winner === 'defender'
              ? battlePreview.isAttacker ? 'Defeat' : 'Victory'
              : 'Draw'}
          </span>
          {(battlePreview.debris.metal > 0 || battlePreview.debris.crystal > 0) && (
            <span className="text-gray-500">
              Debris: {((battlePreview.debris.metal + battlePreview.debris.crystal) / 1000).toFixed(0)}K
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MESSAGE DETAIL COMPONENT
// ============================================================================

interface MessageDetailProps {
  message: Message
  battlePreview: BattlePreviewData | null
  onDelete: () => void
  tCommon: ReturnType<typeof useTranslations>
}

function MessageDetail({ message, battlePreview, onDelete, tCommon }: MessageDetailProps) {
  const isBattle = message.type === 'battle'

  return (
    <div className="ogame-panel">
      <div className="ogame-panel-header flex justify-between items-center">
        <span className="truncate">{message.subject}</span>
        <button
          onClick={onDelete}
          className="text-xs ogame-button-danger"
        >
          {tCommon('delete')}
        </button>
      </div>
      <div className="ogame-panel-content">
        <div className="text-xs text-ogame-text-muted mb-4">
          {new Date(message.created_at).toLocaleString()}
        </div>

        {/* Battle preview card for battle messages */}
        {isBattle && battlePreview && (
          <div className="mb-4">
            <BattlePreview battle={battlePreview} />
          </div>
        )}

        {/* Regular message body */}
        <div className="text-sm whitespace-pre-wrap">
          {message.body}
        </div>

        {/* Battle action button */}
        {isBattle && battlePreview && (
          <div className="mt-4 pt-4 border-t border-ogame-border">
            <Link
              href={`/game/battle/${battlePreview.id}`}
              className="block w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-center text-white font-semibold transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Watch Battle Replay in 3D
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MessagesPage() {
  const { user } = useGameStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<MessageCategory>('all')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const t = useTranslations('messages')
  const tCommon = useTranslations('common')

  // Parse battle previews for all battle messages
  const battlePreviews = useMemo(() => {
    const previews = new Map<string, BattlePreviewData | null>()
    messages.forEach(msg => {
      if (msg.type === 'battle' && user) {
        previews.set(msg.id, parseBattlePreview(msg, user.id))
      }
    })
    return previews
  }, [messages, user])

  useEffect(() => {
    loadMessages()
  }, [category, user])

  const loadMessages = async () => {
    if (!user) return
    setLoading(true)

    const supabase = getSupabaseClient()

    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (category !== 'all') {
      query = query.eq('type', category)
    }

    const { data } = await query
    setMessages(data || [])
    setLoading(false)
  }

  const markAsRead = async (messageId: string) => {
    const supabase = getSupabaseClient()
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId)

    setMessages(messages.map(m =>
      m.id === messageId ? { ...m, read: true } : m
    ))
  }

  const deleteMessage = async (messageId: string) => {
    const supabase = getSupabaseClient()
    await supabase
      .from('messages')
      .update({ deleted: true })
      .eq('id', messageId)

    setMessages(messages.filter(m => m.id !== messageId))
    setSelectedMessage(null)
  }

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message)
    if (!message.read) markAsRead(message.id)
  }

  const categories: { id: MessageCategory; label: string; icon: string }[] = [
    { id: 'all', label: t('categories.all'), icon: '📬' },
    { id: 'espionage', label: t('categories.espionage'), icon: '🔍' },
    { id: 'battle', label: t('categories.combat'), icon: '⚔️' },
    { id: 'transport', label: t('categories.transport'), icon: '📦' },
    { id: 'expedition', label: t('categories.expedition'), icon: '🧭' },
    { id: 'system', label: t('categories.system'), icon: '⚙️' },
  ]

  const unreadCount = messages.filter(m => !m.read).length
  const battleCount = messages.filter(m => m.type === 'battle').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>
        <div className="flex items-center gap-4">
          {battleCount > 0 && (
            <span className="px-3 py-1 bg-red-900/30 border border-red-500/30 rounded-full text-red-300 text-sm">
              {battleCount} combat report{battleCount > 1 ? 's' : ''}
            </span>
          )}
          <div className="text-ogame-text-muted">
            {unreadCount} {t('unread')}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Categories */}
        <div className="w-48 flex-shrink-0">
          <div className="ogame-panel">
            <div className="ogame-panel-header">{t('categoriesTitle')}</div>
            <div className="p-2">
              {categories.map(cat => {
                const catCount = cat.id === 'all'
                  ? messages.length
                  : messages.filter(m => m.type === cat.id).length

                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-sm text-sm transition-colors ${
                      category === cat.id
                        ? 'bg-ogame-accent/10 text-ogame-accent'
                        : 'text-ogame-text-muted hover:bg-ogame-border/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                    {catCount > 0 && (
                      <span className="text-xs bg-ogame-dark px-1.5 py-0.5 rounded">
                        {catCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 ogame-panel">
            <div className="ogame-panel-header">Quick Actions</div>
            <div className="p-2 space-y-2">
              <Link
                href="/game/fleet"
                className="block w-full px-3 py-2 bg-ogame-dark/50 hover:bg-ogame-border/50 rounded text-sm text-ogame-text-muted hover:text-ogame-text-header transition-colors text-center"
              >
                View Fleet
              </Link>
              <Link
                href="/game/galaxy"
                className="block w-full px-3 py-2 bg-ogame-dark/50 hover:bg-ogame-border/50 rounded text-sm text-ogame-text-muted hover:text-ogame-text-header transition-colors text-center"
              >
                Galaxy View
              </Link>
            </div>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1">
          <div className="ogame-panel">
            <div className="ogame-panel-header flex justify-between items-center">
              <span>{t('inbox')}</span>
              <button onClick={loadMessages} className="text-xs ogame-button">
                {t('refresh')}
              </button>
            </div>
            <div className="ogame-panel-content p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-ogame-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-ogame-text-muted text-center py-8">{t('noMessages')}</p>
              ) : (
                <div className="divide-y divide-ogame-border">
                  {messages.map(message => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      isSelected={selectedMessage?.id === message.id}
                      onSelect={() => handleSelectMessage(message)}
                      battlePreview={battlePreviews.get(message.id) || null}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message detail */}
        {selectedMessage && (
          <div className="w-96 flex-shrink-0">
            <MessageDetail
              message={selectedMessage}
              battlePreview={battlePreviews.get(selectedMessage.id) || null}
              onDelete={() => deleteMessage(selectedMessage.id)}
              tCommon={tCommon}
            />
          </div>
        )}
      </div>
    </div>
  )
}
