/**
 * Post-processing effects for OGameX 3D scenes
 * Provides cinematic effects for space ambiance and combat sequences
 */

'use client'

import { JSX } from 'react'
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
  DepthOfField,
  ToneMapping,
  SMAA,
} from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'

// Effect configuration interfaces
export interface SpaceEffectsProps {
  bloomIntensity?: number
  bloomThreshold?: number
  chromaticAberrationOffset?: number
  vignetteDarkness?: number
}

export interface CombatEffectsProps {
  intensity?: number
  shakeAmount?: number
}

export interface CinematicEffectsProps {
  focusDistance?: number
  focalLength?: number
  bokehScale?: number
}

/**
 * Space ambiance post-processing effects
 * Provides the characteristic glow of stars and subtle visual enhancements
 */
export function SpaceEffects({
  bloomIntensity = 0.5,
  bloomThreshold = 0.6,
  chromaticAberrationOffset = 0.0005,
  vignetteDarkness = 0.4,
}: SpaceEffectsProps): JSX.Element {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.9}
        intensity={bloomIntensity}
        mipmapBlur
      />
      <ChromaticAberration
        offset={[chromaticAberrationOffset, chromaticAberrationOffset]}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette
        offset={0.3}
        darkness={vignetteDarkness}
        blendFunction={BlendFunction.NORMAL}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

/**
 * Space effects without chromatic aberration
 * Lighter variant for better performance
 */
export function SpaceEffectsLight({
  bloomIntensity = 0.4,
  bloomThreshold = 0.7,
}: {
  bloomIntensity?: number
  bloomThreshold?: number
}): JSX.Element {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.9}
        intensity={bloomIntensity}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

/**
 * Combat/battle post-processing effects
 * More intense visual effects for action sequences
 */
export function CombatEffects({
  intensity = 1.0,
}: CombatEffectsProps): JSX.Element {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        luminanceThreshold={0.4}
        luminanceSmoothing={0.8}
        intensity={0.8 * intensity}
        mipmapBlur
      />
      <ChromaticAberration
        offset={[0.002 * intensity, 0.002 * intensity]}
        blendFunction={BlendFunction.NORMAL}
        radialModulation
        modulationOffset={0.5}
      />
      <Noise
        opacity={0.02 * intensity}
        blendFunction={BlendFunction.OVERLAY}
      />
      <Vignette
        offset={0.2}
        darkness={0.5 * intensity}
        blendFunction={BlendFunction.NORMAL}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

/**
 * Cinematic depth of field effects
 * For dramatic closeup shots and cutscenes
 */
export function CinematicEffects({
  focusDistance = 10,
  focalLength = 0.05,
  bokehScale = 3,
}: CinematicEffectsProps): JSX.Element {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <DepthOfField
        focusDistance={focusDistance}
        focalLength={focalLength}
        bokehScale={bokehScale}
      />
      <Bloom
        luminanceThreshold={0.7}
        luminanceSmoothing={0.9}
        intensity={0.3}
        mipmapBlur
      />
      <Vignette
        offset={0.4}
        darkness={0.6}
        blendFunction={BlendFunction.NORMAL}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

/**
 * Minimal effects for performance-sensitive scenarios
 */
export function MinimalEffects(): JSX.Element {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.8}
        luminanceSmoothing={0.9}
        intensity={0.2}
        mipmapBlur={false}
      />
      <ToneMapping mode={ToneMappingMode.LINEAR} />
    </EffectComposer>
  )
}

/**
 * Galaxy/strategic map effects
 * Optimized for viewing many objects at once
 */
export function GalaxyEffects(): JSX.Element {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        luminanceThreshold={0.5}
        luminanceSmoothing={0.95}
        intensity={0.4}
        mipmapBlur
      />
      <Vignette
        offset={0.5}
        darkness={0.3}
        blendFunction={BlendFunction.NORMAL}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

/**
 * Hyperspace/warp effect configuration
 * For jump sequences and travel animations
 */
export function HyperspaceEffects({
  intensity = 1.0,
}: {
  intensity?: number
}): JSX.Element {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.2}
        luminanceSmoothing={0.5}
        intensity={1.5 * intensity}
        mipmapBlur
      />
      <ChromaticAberration
        offset={[0.01 * intensity, 0.01 * intensity]}
        blendFunction={BlendFunction.NORMAL}
        radialModulation
        modulationOffset={0}
      />
      <Noise
        opacity={0.1 * intensity}
        blendFunction={BlendFunction.SCREEN}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

// Effect preset configurations for easy switching
export const EFFECT_PRESETS = {
  space: {
    component: SpaceEffects,
    defaultProps: {
      bloomIntensity: 0.5,
      bloomThreshold: 0.6,
      chromaticAberrationOffset: 0.0005,
      vignetteDarkness: 0.4,
    },
  },
  spaceLight: {
    component: SpaceEffectsLight,
    defaultProps: {
      bloomIntensity: 0.4,
      bloomThreshold: 0.7,
    },
  },
  combat: {
    component: CombatEffects,
    defaultProps: {
      intensity: 1.0,
    },
  },
  cinematic: {
    component: CinematicEffects,
    defaultProps: {
      focusDistance: 10,
      focalLength: 0.05,
      bokehScale: 3,
    },
  },
  minimal: {
    component: MinimalEffects,
    defaultProps: {},
  },
  galaxy: {
    component: GalaxyEffects,
    defaultProps: {},
  },
  hyperspace: {
    component: HyperspaceEffects,
    defaultProps: {
      intensity: 1.0,
    },
  },
} as const

export type EffectPreset = keyof typeof EFFECT_PRESETS
