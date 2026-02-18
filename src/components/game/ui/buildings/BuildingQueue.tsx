'use client'

/**
 * BuildingQueue - Shows current building in progress with countdown
 */

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { GameConfigService } from '@/lib/game/GameConfigService'

interface QueueItem {
  id: string
  building_id: number
  target_level: number
  start_time: string
  end_time: string
}

interface BuildingQueueProps {
  planetId: string
  onComplete?: () => void
}

function formatTimeRemaining(endTime: string): string {
  const remaining = new Date(endTime).getTime() - Date.now()
  if (remaining <= 0) return 'Complete!'

  const seconds = Math.floor(remaining / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours}h ${mins}m ${secs}s`
}

export function BuildingQueue({ planetId, onComplete }: BuildingQueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [progress, setProgress] = useState(0)

  // Load queue
  useEffect(() => {
    async function loadQueue() {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('building_queue')
        .select('*')
        .eq('planet_id', planetId)
        .order('start_time', { ascending: true })

      if (data) {
        setQueue(data as QueueItem[])
      }
    }
    loadQueue()

    // Poll every 5 seconds
    const interval = setInterval(loadQueue, 5000)
    return () => clearInterval(interval)
  }, [planetId])

  // Countdown timer
  useEffect(() => {
    if (queue.length === 0) return

    const current = queue[0]
    const endTime = new Date(current.end_time).getTime()
    const startTime = new Date(current.start_time).getTime()
    const totalDuration = endTime - startTime

    const tick = () => {
      const now = Date.now()
      const remaining = endTime - now

      if (remaining <= 0) {
        setTimeRemaining('Complete!')
        setProgress(100)
        onComplete?.()
        return
      }

      setTimeRemaining(formatTimeRemaining(current.end_time))
      setProgress(((totalDuration - remaining) / totalDuration) * 100)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [queue, onComplete])

  if (queue.length === 0) {
    return null
  }

  const current = queue[0]
  const config = GameConfigService.getInstance()
  const building = config.getBuildingById(current.building_id)

  return (
    <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-600/50 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏗️</span>
          <span className="font-semibold text-white">
            {building?.name || `Building #${current.building_id}`}
          </span>
          <span className="text-cyan-400">Level {current.target_level}</span>
        </div>
        <div className="text-yellow-400 font-mono text-lg">
          {timeRemaining}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {queue.length > 1 && (
        <div className="mt-2 text-xs text-slate-400">
          +{queue.length - 1} more in queue
        </div>
      )}
    </div>
  )
}

export default BuildingQueue
