'use client'

/**
 * SoundManager - Procedural Web Audio API sound engine
 *
 * All sounds generated via OscillatorNode / GainNode / BiquadFilterNode.
 * No external audio files needed. Singleton pattern.
 */

interface AudioSettings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
}

const STORAGE_KEY = 'ogamex_audio_settings'
const DEFAULT_SETTINGS: AudioSettings = { masterVolume: 0.5, musicVolume: 0.3, sfxVolume: 0.6 }

class SoundManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private ambientOsc: OscillatorNode | null = null
  private ambientRunning = false
  private settings: AudioSettings = { ...DEFAULT_SETTINGS }

  constructor() { this.loadSettings() }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.musicGain = this.ctx.createGain()
      this.sfxGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
      this.musicGain.connect(this.masterGain)
      this.sfxGain.connect(this.masterGain)
      this.applyVolumes()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  private loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch { /* noop */ }
  }

  private saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)) } catch { /* noop */ }
  }

  private applyVolumes() {
    if (this.masterGain) this.masterGain.gain.value = this.settings.masterVolume
    if (this.musicGain) this.musicGain.gain.value = this.settings.musicVolume
    if (this.sfxGain) this.sfxGain.gain.value = this.settings.sfxVolume
  }

  getSettings(): AudioSettings { return { ...this.settings } }

  setMasterVolume(v: number) {
    this.settings.masterVolume = Math.max(0, Math.min(1, v))
    this.applyVolumes(); this.saveSettings()
  }

  setMusicVolume(v: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, v))
    this.applyVolumes(); this.saveSettings()
  }

  setSfxVolume(v: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, v))
    this.applyVolumes(); this.saveSettings()
  }

  setMuteAll(muted: boolean) {
    this.settings.masterVolume = muted ? 0 : DEFAULT_SETTINGS.masterVolume
    this.applyVolumes(); this.saveSettings()
  }

  // --- Ambient drone (low freq filtered sawtooth) ---

  startAmbient() {
    if (this.ambientRunning) return
    const ctx = this.ensureCtx()
    if (!this.musicGain) return
    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'; osc.frequency.value = 60
    filter.type = 'lowpass'; filter.frequency.value = 120; filter.Q.value = 2
    gain.gain.value = 0.15
    osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain)
    osc.start()
    this.ambientOsc = osc; this.ambientRunning = true
  }

  stopAmbient() {
    if (this.ambientOsc) { try { this.ambientOsc.stop() } catch { /* */ } this.ambientOsc = null }
    this.ambientRunning = false
  }

  // --- SFX: weapon fire (short high-pitched descending beep) ---

  playWeaponFire() {
    const ctx = this.ensureCtx(); if (!this.sfxGain) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1800, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    osc.connect(gain); gain.connect(this.sfxGain)
    osc.start(now); osc.stop(now + 0.12)
  }

  // --- SFX: explosion (noise burst with lowpass sweep) ---

  playExplosion() {
    const ctx = this.ensureCtx(); if (!this.sfxGain) return
    const now = ctx.currentTime
    const bufLen = ctx.sampleRate * 0.5
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.1))
    const src = ctx.createBufferSource(); src.buffer = buffer
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, now)
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.5)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.6, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain)
    src.start(now)
  }

  // --- SFX: mining tick (short triangle blip) ---

  playMiningTick() {
    const ctx = this.ensureCtx(); if (!this.sfxGain) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'triangle'; osc.frequency.value = 600
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
    osc.connect(gain); gain.connect(this.sfxGain)
    osc.start(now); osc.stop(now + 0.06)
  }

  // --- SFX: warp start (freq sweep up) ---

  playWarpStart() {
    const ctx = this.ensureCtx(); if (!this.sfxGain) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(100, now)
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.8)
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.setValueAtTime(0.25, now + 0.6)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
    osc.connect(gain); gain.connect(this.sfxGain)
    osc.start(now); osc.stop(now + 1.0)
  }

  // --- SFX: warp end (freq sweep down) ---

  playWarpEnd() {
    const ctx = this.ensureCtx(); if (!this.sfxGain) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(2000, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.6)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    osc.connect(gain); gain.connect(this.sfxGain)
    osc.start(now); osc.stop(now + 0.8)
  }

  // --- SFX: dock (mechanical clunk) ---

  playDock() {
    const ctx = this.ensureCtx(); if (!this.sfxGain) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.setValueAtTime(150, now + 0.05)
    osc.frequency.setValueAtTime(100, now + 0.1)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
    osc.connect(gain); gain.connect(this.sfxGain)
    osc.start(now); osc.stop(now + 0.2)
  }

  // --- SFX: UI click (soft sine blip) ---

  playUIClick() {
    const ctx = this.ensureCtx(); if (!this.sfxGain) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = 'sine'; osc.frequency.value = 1000
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
    osc.connect(gain); gain.connect(this.sfxGain)
    osc.start(now); osc.stop(now + 0.03)
  }

  dispose() {
    this.stopAmbient()
    if (this.ctx) { this.ctx.close(); this.ctx = null }
  }
}

// Singleton + hook
let instance: SoundManager | null = null

export function getSoundManager(): SoundManager {
  if (!instance) instance = new SoundManager()
  return instance
}

export function useSoundManager(): SoundManager { return getSoundManager() }
export type { AudioSettings }
