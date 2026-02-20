'use client'

/**
 * SettingsWindow - Graphics, Audio, Controls
 * 3-tab settings panel. Persists to localStorage.
 */

import { useState, useEffect, useCallback, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { getSoundManager } from '@/lib/audio/SoundManager'

type SettingsTab = 'graphics' | 'audio' | 'controls'

interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra'
  bloom: boolean
  fxaa: boolean
  maxFps: 30 | 60 | 120 | 0
}

interface AudioSettingsState {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  muteAll: boolean
}

const SETTINGS_KEY = 'ogamex_settings'
const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'graphics', label: 'Graphics' },
  { key: 'audio', label: 'Audio' },
  { key: 'controls', label: 'Controls' },
]
const DEFAULT_GFX: GraphicsSettings = { quality: 'high', bloom: true, fxaa: true, maxFps: 60 }
const DEFAULT_AUDIO: AudioSettingsState = { masterVolume: 50, musicVolume: 30, sfxVolume: 60, muteAll: false }

const KEYBINDS = [
  { key: 'W', action: 'Accelerate forward' },
  { key: 'S', action: 'Decelerate / reverse' },
  { key: 'A', action: 'Rotate left' },
  { key: 'D', action: 'Rotate right' },
  { key: 'Space', action: 'Full stop' },
  { key: 'F1-F8', action: 'Activate module slot' },
  { key: 'Ctrl+Click', action: 'Lock target' },
  { key: 'Tab', action: 'Next target' },
  { key: 'M', action: 'Toggle starmap' },
  { key: 'I', action: 'Toggle inventory' },
  { key: 'Esc', action: 'Deselect / close' },
]

function loadSettings(): { gfx: GraphicsSettings; audio: AudioSettingsState } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return { gfx: { ...DEFAULT_GFX, ...p.gfx }, audio: { ...DEFAULT_AUDIO, ...p.audio } }
    }
  } catch { /* noop */ }
  return { gfx: { ...DEFAULT_GFX }, audio: { ...DEFAULT_AUDIO } }
}

function saveSettings(gfx: GraphicsSettings, audio: AudioSettingsState) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ gfx, audio })) } catch { /* noop */ }
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-300">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-blue-600' : 'bg-slate-700'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs text-blue-300 font-mono">{value}</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400"
      />
    </div>
  )
}

const GraphicsTab = memo(function GraphicsTab({ gfx, setGfx }: { gfx: GraphicsSettings; setGfx: (g: GraphicsSettings) => void }) {
  return (
    <div className="p-3 space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-slate-400">Quality Preset</label>
        <div className="flex gap-1">
          {(['low', 'medium', 'high', 'ultra'] as const).map((q) => (
            <button key={q} onClick={() => setGfx({ ...gfx, quality: q })}
              className={`flex-1 px-2 py-1.5 text-xs rounded capitalize transition-colors ${
                gfx.quality === q ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}>{q}</button>
          ))}
        </div>
      </div>
      <ToggleRow label="Bloom" value={gfx.bloom} onChange={(v) => setGfx({ ...gfx, bloom: v })} />
      <ToggleRow label="FXAA Anti-Aliasing" value={gfx.fxaa} onChange={(v) => setGfx({ ...gfx, fxaa: v })} />
      <div className="space-y-1">
        <label className="text-xs text-slate-400">Max FPS</label>
        <div className="flex gap-1">
          {([30, 60, 120, 0] as const).map((fps) => (
            <button key={fps} onClick={() => setGfx({ ...gfx, maxFps: fps })}
              className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                gfx.maxFps === fps ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}>{fps === 0 ? 'Unlimited' : fps}</button>
          ))}
        </div>
      </div>
    </div>
  )
})

const AudioTab = memo(function AudioTab({ audio, setAudio }: { audio: AudioSettingsState; setAudio: (a: AudioSettingsState) => void }) {
  return (
    <div className="p-3 space-y-3">
      <SliderRow label="Master Volume" value={audio.masterVolume} onChange={(v) => setAudio({ ...audio, masterVolume: v, muteAll: false })} />
      <SliderRow label="Music Volume" value={audio.musicVolume} onChange={(v) => setAudio({ ...audio, musicVolume: v })} />
      <SliderRow label="SFX Volume" value={audio.sfxVolume} onChange={(v) => setAudio({ ...audio, sfxVolume: v })} />
      <ToggleRow label="Mute All" value={audio.muteAll} onChange={(v) => setAudio({ ...audio, muteAll: v, masterVolume: v ? 0 : 50 })} />
    </div>
  )
})

const ControlsTab = memo(function ControlsTab() {
  return (
    <div className="p-3">
      <div className="text-xs text-slate-400 mb-2">Default Keybinds (read-only)</div>
      <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
        {KEYBINDS.map((kb) => (
          <div key={kb.key} className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50 rounded text-xs">
            <span className="text-slate-300">{kb.action}</span>
            <kbd className="px-2 py-0.5 bg-slate-700 text-blue-300 rounded font-mono text-[10px]">{kb.key}</kbd>
          </div>
        ))}
      </div>
    </div>
  )
})

const SettingsContent = memo(function SettingsContent() {
  const [tab, setTab] = useState<SettingsTab>('graphics')
  const [gfx, setGfxState] = useState<GraphicsSettings>(DEFAULT_GFX)
  const [audio, setAudioState] = useState<AudioSettingsState>(DEFAULT_AUDIO)

  useEffect(() => {
    const loaded = loadSettings()
    setGfxState(loaded.gfx)
    setAudioState(loaded.audio)
  }, [])

  const setGfx = useCallback((g: GraphicsSettings) => {
    setGfxState(g); saveSettings(g, audio)
    window.dispatchEvent(new CustomEvent('ogamex-settings-changed', { detail: { gfx: g } }))
  }, [audio])

  const setAudio = useCallback((a: AudioSettingsState) => {
    setAudioState(a); saveSettings(gfx, a)
    const sm = getSoundManager()
    sm.setMasterVolume(a.masterVolume / 100)
    sm.setMusicVolume(a.musicVolume / 100)
    sm.setSfxVolume(a.sfxVolume / 100)
  }, [gfx])

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-700">
        {TABS.map((t) => (
          <button key={t.key}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'graphics' && <GraphicsTab gfx={gfx} setGfx={setGfx} />}
        {tab === 'audio' && <AudioTab audio={audio} setAudio={setAudio} />}
        {tab === 'controls' && <ControlsTab />}
      </div>
    </div>
  )
})

export function SettingsWindow() {
  return (
    <ManagedWindow
      id="rt-settings" title="Settings" icon="gear"
      defaultPosition={{ x: 350, y: 150 }}
      defaultSize={{ width: 380, height: 420 }}
      minWidth={320} minHeight={300}
    >
      <SettingsContent />
    </ManagedWindow>
  )
}
