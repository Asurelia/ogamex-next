import type { GameEngine } from '../GameEngine'

export interface ParticleRenderer {
  update(dt: number): void
}

let _renderer: ParticleRenderer | null = null

export function setParticleRenderer(renderer: ParticleRenderer | null): void {
  _renderer = renderer
}

export function particleUpdateSystem(_engine: GameEngine, dt: number): void {
  if (_renderer) {
    _renderer.update(dt)
  }
}
