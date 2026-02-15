'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResourcePanel } from './panels/ResourcePanel'
import { BoostPanel } from './panels/BoostPanel'
import { DebugPanel } from './panels/DebugPanel'
import { useDevMode } from './hooks/useDevMode'

type PanelType = 'resources' | 'boosts' | 'debug' | null

export function DevOverlay() {
  const { isAdmin, isEnabled, setEnabled } = useDevMode()
  const [isOpen, setIsOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [position, setPosition] = useState({ x: 20, y: 100 })

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        if (isAdmin) {
          setIsOpen((prev) => !prev)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAdmin])

  const panels = [
    { id: 'resources' as const, icon: '💰', label: 'Resources' },
    { id: 'boosts' as const, icon: '⚡', label: 'Boosts' },
    { id: 'debug' as const, icon: '🐛', label: 'Debug' },
  ]

  if (!isAdmin) return null

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        className="fixed z-50 p-3 rounded-full shadow-lg"
        style={{
          right: '20px',
          bottom: '20px',
          background: isOpen ? '#00ffcc' : 'linear-gradient(135deg, #1a1a2e, #16213e)',
          border: '2px solid #00ffcc',
          color: isOpen ? '#000' : '#00ffcc',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        title="Dev Tools (Ctrl+Shift+D)"
      >
        <span className="text-xl">{isOpen ? '✕' : '🛠️'}</span>
      </motion.button>

      {/* Overlay Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed z-40 rounded-lg shadow-2xl overflow-hidden"
            style={{
              right: '20px',
              bottom: '80px',
              width: '320px',
              maxHeight: 'calc(100vh - 120px)',
              background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95))',
              border: '1px solid rgba(0, 255, 204, 0.3)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{
                background: 'linear-gradient(90deg, rgba(0, 255, 204, 0.1), transparent)',
                borderBottom: '1px solid rgba(0, 255, 204, 0.2)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🛠️</span>
                <span className="font-semibold text-cyan-400">Dev Tools</span>
              </div>
              <span className="text-xs text-gray-500">Ctrl+Shift+D</span>
            </div>

            {/* Panel Tabs */}
            <div className="flex border-b border-gray-700">
              {panels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => setActivePanel(activePanel === panel.id ? null : panel.id)}
                  className={`flex-1 py-2 text-center transition-colors ${
                    activePanel === panel.id
                      ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  title={panel.label}
                >
                  <span className="text-lg">{panel.icon}</span>
                </button>
              ))}
            </div>

            {/* Active Panel Content */}
            <div className="max-h-96 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activePanel === 'resources' && (
                  <motion.div
                    key="resources"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ResourcePanel />
                  </motion.div>
                )}
                {activePanel === 'boosts' && (
                  <motion.div
                    key="boosts"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <BoostPanel />
                  </motion.div>
                )}
                {activePanel === 'debug' && (
                  <motion.div
                    key="debug"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <DebugPanel />
                  </motion.div>
                )}
              </AnimatePresence>

              {!activePanel && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Select a panel above
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2 text-xs text-gray-500 border-t border-gray-700"
              style={{ background: 'rgba(0, 0, 0, 0.3)' }}
            >
              Admin tools - Changes are logged
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default DevOverlay
