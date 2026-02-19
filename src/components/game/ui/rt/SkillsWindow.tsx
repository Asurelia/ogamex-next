'use client'

import { useState, useMemo, useEffect, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES = [
  'All',
  'Navigation',
  'Engineering',
  'Gunnery',
  'Drones',
  'Mining',
  'Trade',
  'Defense',
]

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(seconds: number): string {
  if (seconds <= 0) return 'Complete'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

// ============================================================================
// LEVEL DOTS
// ============================================================================

function LevelDots({ level, maxLevel }: { level: number; maxLevel: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxLevel }, (_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < level ? 'bg-cyan-400' : 'bg-slate-600'
          }`}
        />
      ))}
    </div>
  )
}

// ============================================================================
// SKILLS CONTENT
// ============================================================================

const SkillsContent = memo(function SkillsContent() {
  const { skills, skillQueue, trainSkill } = useRTGameStore()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [queueCountdown, setQueueCountdown] = useState(0)

  const filteredSkills = useMemo(() => {
    if (selectedCategory === 'All') return skills
    return skills.filter((s) => s.category === selectedCategory)
  }, [skills, selectedCategory])

  // Countdown timer for skill queue
  useEffect(() => {
    if (skillQueue.length === 0) return
    const totalSeconds = skillQueue.reduce((sum, item) => sum + item.remainingSeconds, 0)
    setQueueCountdown(totalSeconds)

    const interval = setInterval(() => {
      setQueueCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [skillQueue])

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-slate-700">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              selectedCategory === cat
                ? 'bg-cyan-700/50 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skill List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSkills.length === 0 && (
          <div className="text-center text-slate-500 py-4">No skills in this category</div>
        )}
        {filteredSkills.map((skill) => (
          <div
            key={skill.id}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/30 border-b border-slate-800/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-slate-200 ${skill.training ? 'text-cyan-300' : ''}`}>
                  {skill.name}
                </span>
                {skill.training && (
                  <span className="text-[9px] bg-cyan-700/30 text-cyan-400 px-1 rounded">TRAINING</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <LevelDots level={skill.level} maxLevel={skill.maxLevel} />
                <span className="text-slate-500">
                  {skill.currentSP.toLocaleString()} / {skill.requiredSP.toLocaleString()} SP
                </span>
              </div>
            </div>
            {skill.level < skill.maxLevel && !skill.training && (
              <button
                onClick={() => trainSkill(skill.id)}
                className="px-2 py-1 bg-cyan-700/40 hover:bg-cyan-600/40 text-cyan-300 rounded transition-colors shrink-0"
              >
                Train
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Training Queue */}
      <div className="border-t border-slate-700">
        <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50">
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Training Queue</span>
          <span className="text-cyan-400">{formatTime(queueCountdown)}</span>
        </div>
        <div className="max-h-24 overflow-y-auto">
          {skillQueue.length === 0 && (
            <div className="text-center text-slate-500 py-2">Queue empty</div>
          )}
          {skillQueue.map((item, i) => (
            <div key={`${item.skillId}-${item.targetLevel}`} className="flex items-center gap-2 px-2 py-1 text-[11px]">
              <span className="text-slate-500 w-4">{i + 1}.</span>
              <span className="text-slate-200 flex-1">{item.skillName} Lv.{item.targetLevel}</span>
              <span className="text-slate-400">{formatTime(item.remainingSeconds)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// EXPORT
// ============================================================================

export function SkillsWindow() {
  return (
    <ManagedWindow
      id="rt-skills"
      title="Skills"
      icon="📖"
      defaultPosition={{ x: 280, y: 80 }}
      defaultSize={{ width: 420, height: 450 }}
      minWidth={340}
      minHeight={300}
    >
      <SkillsContent />
    </ManagedWindow>
  )
}
