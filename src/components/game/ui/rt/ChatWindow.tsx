'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

// ============================================================================
// TYPES
// ============================================================================

type ChatChannel = 'local' | 'corp' | 'system'

const CHANNEL_TABS: { key: ChatChannel; label: string; color: string }[] = [
  { key: 'local', label: 'Local', color: 'text-green-400' },
  { key: 'corp', label: 'Corp', color: 'text-blue-400' },
  { key: 'system', label: 'System', color: 'text-yellow-400' },
]

// ============================================================================
// HELPERS
// ============================================================================

function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function senderColor(sender: string): string {
  // Simple hash-based color
  let hash = 0
  for (let i = 0; i < sender.length; i++) {
    hash = sender.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    'text-cyan-300', 'text-green-300', 'text-yellow-300', 'text-purple-300',
    'text-pink-300', 'text-orange-300', 'text-teal-300', 'text-indigo-300',
  ]
  return colors[Math.abs(hash) % colors.length]
}

// ============================================================================
// CHAT CONTENT
// ============================================================================

const ChatContent = memo(function ChatContent() {
  const { chatMessages, chat } = useRTGameStore()
  const [activeChannel, setActiveChannel] = useState<ChatChannel>('local')
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const filteredMessages = chatMessages.filter((msg) => msg.channel === activeChannel)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredMessages.length])

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    chat(activeChannel, trimmed)
    setInputValue('')
  }, [inputValue, activeChannel, chat])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Channel Tabs */}
      <div className="flex border-b border-slate-700">
        {CHANNEL_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeChannel === tab.key
                ? `${tab.color} border-b-2 border-current bg-slate-800/50`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveChannel(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto pr-2 flex items-center">
          <span className="text-[10px] text-slate-500">{filteredMessages.length} msgs</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 text-xs">
        {filteredMessages.length === 0 && (
          <div className="text-center text-slate-500 py-4">No messages in this channel</div>
        )}
        {filteredMessages.map((msg, i) => (
          <div key={`${msg.timestamp}-${msg.senderId}-${i}`} className="flex gap-1.5 leading-relaxed">
            <span className="text-slate-500 shrink-0">[{formatTimestamp(msg.timestamp)}]</span>
            <span className={`font-medium shrink-0 ${senderColor(msg.senderName)}`}>{msg.senderName}:</span>
            <span className="text-slate-200 break-words">{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-1 p-2 border-t border-slate-700">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${activeChannel}...`}
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs rounded transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
})

// ============================================================================
// EXPORT
// ============================================================================

export function ChatWindow() {
  return (
    <ManagedWindow
      id="rt-chat"
      title="Chat"
      icon="💬"
      defaultPosition={{ x: 10, y: 400 }}
      defaultSize={{ width: 380, height: 300 }}
      minWidth={280}
      minHeight={200}
    >
      <ChatContent />
    </ManagedWindow>
  )
}
