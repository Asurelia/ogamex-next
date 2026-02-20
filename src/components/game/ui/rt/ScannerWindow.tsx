'use client'

/**
 * Scanner Window
 *
 * Probe control, scan results, D-scan, WH info.
 */

import { useState, useCallback, memo, useMemo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

const SCAN_RADIUS_OPTIONS = [0.25, 0.5, 1, 2, 4, 8, 16, 32]

const SIGNATURE_ICONS: Record<string, string> = {
  wormhole: '🌀',
  data_site: '💾',
  relic_site: '🏺',
  gas_site: '☁️',
  combat_site: '⚔️',
  ore_site: '⛏️',
  unknown: '❓',
}

const ScannerContent = memo(function ScannerContent() {
  const { scanResults, scanProbeCount } = useRTGameStore()
  const [scanRadius, setScanRadius] = useState(8)
  const [activeView, setActiveView] = useState<'probes' | 'dscan'>('probes')

  const handleLaunchProbes = useCallback(() => {
    useRTGameStore.getState().scanLaunchProbes(scanRadius)
  }, [scanRadius])

  const handleScan = useCallback(() => {
    useRTGameStore.getState().scanInitiate()
  }, [])

  const sortedResults = useMemo(
    () => [...scanResults].sort((a, b) => b.scanStrength - a.scanStrength),
    [scanResults]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-2 border-b border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              className={`px-2 py-1 text-[10px] rounded ${activeView === 'probes' ? 'bg-cyan-800 text-white' : 'bg-slate-700 text-slate-400'}`}
              onClick={() => setActiveView('probes')}
            >
              Probes
            </button>
            <button
              className={`px-2 py-1 text-[10px] rounded ${activeView === 'dscan' ? 'bg-cyan-800 text-white' : 'bg-slate-700 text-slate-400'}`}
              onClick={() => setActiveView('dscan')}
            >
              D-Scan
            </button>
          </div>
          <span className="text-[10px] text-slate-400">Probes: {scanProbeCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={scanRadius}
            onChange={(e) => setScanRadius(parseFloat(e.target.value))}
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
          >
            {SCAN_RADIUS_OPTIONS.map(r => (
              <option key={r} value={r}>{r} AU</option>
            ))}
          </select>
          <button
            onClick={handleLaunchProbes}
            className="px-3 py-1 bg-blue-800 hover:bg-blue-700 text-white text-xs rounded"
          >
            Deploy
          </button>
          <button
            onClick={handleScan}
            className="px-3 py-1 bg-green-800 hover:bg-green-700 text-white text-xs rounded"
          >
            Scan
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex px-2 py-1 bg-slate-800/80 text-[10px] text-slate-400 border-b border-slate-700">
          <span className="w-8">Icon</span>
          <span className="flex-1">ID</span>
          <span className="w-20">Type</span>
          <span className="w-16 text-right">Signal</span>
        </div>

        {/* Rows */}
        {sortedResults.map((result) => {
          const icon = SIGNATURE_ICONS[result.resolved ? result.signatureType : 'unknown']
          const strengthColor = result.scanStrength >= 100 ? 'text-green-400' :
            result.scanStrength >= 75 ? 'text-yellow-400' :
            result.scanStrength >= 25 ? 'text-orange-400' : 'text-red-400'

          return (
            <div
              key={result.signatureId}
              className="flex items-center px-2 py-1.5 text-xs border-b border-slate-700/50 hover:bg-slate-800/50 cursor-pointer"
              onClick={() => {
                if (result.resolved && result.position) {
                  useRTGameStore.getState().navigate(result.position.x, result.position.y, result.position.z)
                }
              }}
            >
              <span className="w-8">{icon}</span>
              <span className="flex-1 text-slate-200 font-mono">{result.signatureId}</span>
              <span className="w-20 text-slate-400">
                {result.resolved ? result.signatureType.replace(/_/g, ' ') : '---'}
              </span>
              <div className="w-16 flex items-center justify-end gap-1">
                <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      result.scanStrength >= 100 ? 'bg-green-500' :
                      result.scanStrength >= 75 ? 'bg-yellow-500' :
                      result.scanStrength >= 25 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.scanStrength}%` }}
                  />
                </div>
                <span className={`text-[10px] ${strengthColor}`}>{result.scanStrength.toFixed(0)}%</span>
              </div>
            </div>
          )
        })}

        {sortedResults.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-xs">
            Deploy probes and scan to detect cosmic signatures
          </div>
        )}
      </div>
    </div>
  )
})

export function ScannerWindow() {
  return (
    <ManagedWindow
      id="rt-scanner"
      title="Probe Scanner"
      icon="📡"
      defaultPosition={{ x: 300, y: 100 }}
      defaultSize={{ width: 420, height: 380 }}
      minWidth={350}
      minHeight={280}
    >
      <ScannerContent />
    </ManagedWindow>
  )
}
