'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'

type MessageCategory = 'all' | 'espionage' | 'battle' | 'transport' | 'expedition' | 'system'

export default function MessagesPage() {
  const { user } = useGameStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<MessageCategory>('all')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const t = useTranslations('messages')
  const tCommon = useTranslations('common')

  useEffect(() => {
    loadMessages()
  }, [category])

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

  const categories: { id: MessageCategory; label: string; icon: string }[] = [
    { id: 'all', label: t('categories.all'), icon: '📬' },
    { id: 'espionage', label: t('categories.espionage'), icon: '🔍' },
    { id: 'battle', label: t('categories.combat'), icon: '⚔️' },
    { id: 'transport', label: t('categories.transport'), icon: '📦' },
    { id: 'expedition', label: t('categories.expedition'), icon: '🧭' },
    { id: 'system', label: t('categories.system'), icon: '⚙️' },
  ]

  const unreadCount = messages.filter(m => !m.read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>
        <div className="text-ogame-text-muted">
          {unreadCount} {t('unread')}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Categories */}
        <div className="w-48 flex-shrink-0">
          <div className="ogame-panel">
            <div className="ogame-panel-header">{t('categoriesTitle')}</div>
            <div className="p-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors ${
                    category === cat.id
                      ? 'bg-ogame-accent/10 text-ogame-accent'
                      : 'text-ogame-text-muted hover:bg-ogame-border/50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
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
                <p className="text-ogame-text-muted text-center py-8">{tCommon('loading')}</p>
              ) : messages.length === 0 ? (
                <p className="text-ogame-text-muted text-center py-8">{t('noMessages')}</p>
              ) : (
                <div className="divide-y divide-ogame-border">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      onClick={() => {
                        setSelectedMessage(message)
                        if (!message.read) markAsRead(message.id)
                      }}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id
                          ? 'bg-ogame-accent/10'
                          : 'hover:bg-ogame-border/30'
                      } ${!message.read ? 'border-l-2 border-ogame-accent' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className={`text-sm ${!message.read ? 'text-ogame-text-header font-semibold' : 'text-ogame-text-muted'}`}>
                          {message.subject}
                        </h4>
                        <span className="text-xs text-ogame-text-muted">
                          {new Date(message.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-ogame-text-muted mt-1 truncate">
                        {message.body.substring(0, 100)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message detail */}
        {selectedMessage && (
          <div className="w-96 flex-shrink-0">
            <div className="ogame-panel">
              <div className="ogame-panel-header flex justify-between items-center">
                <span className="truncate">{selectedMessage.subject}</span>
                <button
                  onClick={() => deleteMessage(selectedMessage.id)}
                  className="text-xs ogame-button-danger"
                >
                  {tCommon('delete')}
                </button>
              </div>
              <div className="ogame-panel-content">
                <div className="text-xs text-ogame-text-muted mb-4">
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {selectedMessage.body}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
