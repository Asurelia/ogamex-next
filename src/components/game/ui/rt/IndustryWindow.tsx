'use client'

/**
 * Industry Window
 *
 * 4 tabs: Blueprints, Jobs, Facilities, Invention
 */

import { useState, useCallback, memo, useMemo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

type IndustryTab = 'blueprints' | 'jobs' | 'facilities' | 'invention'

const INDUSTRY_TABS: { key: IndustryTab; label: string }[] = [
  { key: 'blueprints', label: 'Blueprints' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'invention', label: 'Invention' },
]

const ACTIVITY_COLORS: Record<string, string> = {
  manufacturing: 'text-green-400',
  invention: 'text-purple-400',
  copying: 'text-blue-400',
  research_me: 'text-yellow-400',
  research_te: 'text-orange-400',
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}

function formatTimeRemaining(endsAt: string): string {
  const remaining = Math.max(0, new Date(endsAt).getTime() - Date.now())
  return formatDuration(Math.floor(remaining / 1000))
}

const BlueprintsTab = memo(function BlueprintsTab() {
  const { blueprints } = useRTGameStore()

  return (
    <div className="p-2 space-y-1">
      <div className="text-xs text-slate-400 mb-1">{blueprints.length} blueprint(s)</div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {blueprints.map((bp) => (
          <div key={bp.id} className="p-2 bg-slate-800/50 rounded border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-200">{bp.itemName || bp.itemTypeId}</span>
                <span className={`ml-1 text-[10px] ${bp.isOriginal ? 'text-blue-400' : 'text-orange-400'}`}>
                  {bp.isOriginal ? 'BPO' : `BPC (${bp.runsRemaining})`}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">T{bp.techLevel}</span>
            </div>
            <div className="flex gap-3 mt-1 text-[10px]">
              <span className="text-green-400">ME: {bp.materialEfficiency}</span>
              <span className="text-blue-400">TE: {bp.timeEfficiency}</span>
            </div>
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={() => useRTGameStore.getState().industryStartJob(bp.id, 'manufacturing')}
                className="px-2 py-0.5 bg-green-900/50 hover:bg-green-800/50 text-green-300 text-[10px] rounded"
              >
                Manufacture
              </button>
              {bp.isOriginal && (
                <>
                  <button
                    onClick={() => useRTGameStore.getState().industryStartJob(bp.id, 'research_me')}
                    className="px-2 py-0.5 bg-yellow-900/50 hover:bg-yellow-800/50 text-yellow-300 text-[10px] rounded"
                  >
                    ME
                  </button>
                  <button
                    onClick={() => useRTGameStore.getState().industryStartJob(bp.id, 'research_te')}
                    className="px-2 py-0.5 bg-orange-900/50 hover:bg-orange-800/50 text-orange-300 text-[10px] rounded"
                  >
                    TE
                  </button>
                  <button
                    onClick={() => useRTGameStore.getState().industryStartJob(bp.id, 'copying')}
                    className="px-2 py-0.5 bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 text-[10px] rounded"
                  >
                    Copy
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {blueprints.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-xs">No blueprints owned</div>
        )}
      </div>
    </div>
  )
})

const JobsTab = memo(function JobsTab() {
  const { industryJobs } = useRTGameStore()

  const activeJobs = useMemo(() => industryJobs.filter(j => !j.completed), [industryJobs])
  const completedJobs = useMemo(() => industryJobs.filter(j => j.completed), [industryJobs])

  return (
    <div className="p-2 space-y-2">
      <div className="text-xs text-slate-400">Active Jobs ({activeJobs.length})</div>
      <div className="space-y-1 max-h-[150px] overflow-y-auto">
        {activeJobs.map((job) => {
          const totalDuration = job.durationSeconds
          const elapsed = Math.max(0, (Date.now() - new Date(job.startedAt).getTime()) / 1000)
          const progress = Math.min(100, (elapsed / totalDuration) * 100)

          return (
            <div key={job.id} className="p-2 bg-slate-800/50 rounded border border-slate-700">
              <div className="flex items-center justify-between text-xs">
                <span className={ACTIVITY_COLORS[job.activity] || 'text-slate-200'}>
                  {job.activity.replace(/_/g, ' ')}
                </span>
                <span className="text-slate-400">{formatTimeRemaining(job.endsAt)}</span>
              </div>
              <div className="text-[10px] text-slate-400">{job.outputItemName}</div>
              <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-600 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {completedJobs.length > 0 && (
        <>
          <div className="text-xs text-slate-400 mt-2">Ready to Deliver ({completedJobs.length})</div>
          <div className="space-y-1">
            {completedJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-green-800/50">
                <div>
                  <span className="text-xs text-green-400">{job.outputItemName}</span>
                  <span className="text-[10px] text-slate-400 ml-1">x{job.outputQuantity}</span>
                  {!job.completed && <span className="text-[10px] text-yellow-400 ml-1">(In Progress)</span>}
                </div>
                <button
                  onClick={() => useRTGameStore.getState().industryDeliverJob(job.id)}
                  className="px-2 py-0.5 bg-green-800 hover:bg-green-700 text-white text-[10px] rounded"
                >
                  Deliver
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
})

const FacilitiesTab = memo(function FacilitiesTab() {
  return (
    <div className="p-3 text-center text-slate-500 text-xs">
      <div className="mb-2">Station manufacturing facilities</div>
      <div className="grid grid-cols-2 gap-2 text-left">
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="text-[10px] text-green-400">Manufacturing</div>
          <div className="text-[10px] text-slate-400">Available</div>
        </div>
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="text-[10px] text-blue-400">Copying</div>
          <div className="text-[10px] text-slate-400">Available</div>
        </div>
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="text-[10px] text-yellow-400">ME Research</div>
          <div className="text-[10px] text-slate-400">Available</div>
        </div>
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="text-[10px] text-purple-400">Invention</div>
          <div className="text-[10px] text-slate-400">Available</div>
        </div>
      </div>
    </div>
  )
})

const InventionTab = memo(function InventionTab() {
  const { blueprints } = useRTGameStore()
  const bpos = useMemo(() => blueprints.filter(bp => bp.isOriginal && bp.techLevel === 1), [blueprints])

  return (
    <div className="p-2 space-y-1">
      <div className="text-xs text-slate-400 mb-1">T1 BPOs available for invention</div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {bpos.map((bp) => (
          <div key={bp.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700">
            <div>
              <span className="text-xs text-slate-200">{bp.itemName || bp.itemTypeId}</span>
              <div className="text-[10px] text-slate-500">Base chance: ~25%</div>
            </div>
            <button
              onClick={() => useRTGameStore.getState().industryStartJob(bp.id, 'invention')}
              className="px-2 py-0.5 bg-purple-800 hover:bg-purple-700 text-white text-[10px] rounded"
            >
              Invent
            </button>
          </div>
        ))}
        {bpos.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-xs">No T1 BPOs for invention</div>
        )}
      </div>
    </div>
  )
})

const IndustryContent = memo(function IndustryContent() {
  const [activeTab, setActiveTab] = useState<IndustryTab>('blueprints')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-700">
        {INDUSTRY_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'blueprints' && <BlueprintsTab />}
        {activeTab === 'jobs' && <JobsTab />}
        {activeTab === 'facilities' && <FacilitiesTab />}
        {activeTab === 'invention' && <InventionTab />}
      </div>
    </div>
  )
})

export function IndustryWindow() {
  return (
    <ManagedWindow
      id="rt-industry"
      title="Industry"
      icon="🏭"
      defaultPosition={{ x: 200, y: 120 }}
      defaultSize={{ width: 440, height: 420 }}
      minWidth={380}
      minHeight={300}
    >
      <IndustryContent />
    </ManagedWindow>
  )
}
