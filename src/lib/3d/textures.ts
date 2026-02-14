/**
 * Texture management for OGameX 3D rendering
 * Handles loading, caching, and preloading of planet, ship, and building textures
 */

'use client'

import { useLoader } from '@react-three/fiber'
import { TextureLoader, Texture, RepeatWrapping, LinearFilter, SRGBColorSpace } from 'three'
import { useEffect, useMemo } from 'react'
import { PLANET_TYPES, PLANET_VARIANTS, type PlanetType, type PlanetSize } from './constants'

// Texture cache to avoid reloading
const textureCache = new Map<string, Texture>()

// Texture paths configuration
const TEXTURE_PATHS = {
  planets: {
    small: '/img/planets/small',
    medium: '/img/planets/medium',
    big: '/img/planets/big',
  },
  moons: '/img/planets',
  ships: '/img/assets_hq/ships',
  buildings: '/img/assets_hq/buildings',
  effects: '/img/assets_hq/effects',
} as const

/**
 * Build planet texture path based on type, variant, and size
 */
export function getPlanetTexturePath(
  type: PlanetType,
  variant: number = 1,
  size: PlanetSize = 'medium'
): string {
  const clampedVariant = Math.max(1, Math.min(variant, PLANET_VARIANTS))
  return `${TEXTURE_PATHS.planets[size]}/${type}_${clampedVariant}.png`
}

/**
 * Build moon view texture path
 */
export function getMoonViewTexturePath(type: PlanetType): string {
  return `${TEXTURE_PATHS.moons}/${type}_moon_view.jpg`
}

/**
 * Hook to load a single planet texture with caching
 */
export function usePlanetTexture(
  type: PlanetType,
  variant: number = 1,
  size: PlanetSize = 'medium'
): Texture {
  const path = getPlanetTexturePath(type, variant, size)
  const texture = useLoader(TextureLoader, path)

  useMemo(() => {
    if (texture) {
      texture.colorSpace = SRGBColorSpace
      texture.minFilter = LinearFilter
      texture.generateMipmaps = true
      textureCache.set(path, texture)
    }
  }, [texture, path])

  return texture
}

/**
 * Hook to load moon view texture
 */
export function useMoonViewTexture(type: PlanetType): Texture {
  const path = getMoonViewTexturePath(type)
  const texture = useLoader(TextureLoader, path)

  useMemo(() => {
    if (texture) {
      texture.colorSpace = SRGBColorSpace
      textureCache.set(path, texture)
    }
  }, [texture, path])

  return texture
}

/**
 * Get a random variant number for a planet type
 */
export function getRandomPlanetVariant(): number {
  return Math.floor(Math.random() * PLANET_VARIANTS) + 1
}

/**
 * Get a random planet type
 */
export function getRandomPlanetType(): PlanetType {
  return PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)]
}

/**
 * Preload planet textures for faster display
 * Call this during app initialization or loading screens
 */
export async function preloadPlanetTextures(
  types: PlanetType[] = [...PLANET_TYPES],
  size: PlanetSize = 'medium',
  variants: number[] = [1, 2, 3]
): Promise<void> {
  const loader = new TextureLoader()
  const loadPromises: Promise<Texture>[] = []

  for (const type of types) {
    for (const variant of variants) {
      const path = getPlanetTexturePath(type, variant, size)

      if (!textureCache.has(path)) {
        const promise = new Promise<Texture>((resolve, reject) => {
          loader.load(
            path,
            (texture) => {
              texture.colorSpace = SRGBColorSpace
              texture.minFilter = LinearFilter
              textureCache.set(path, texture)
              resolve(texture)
            },
            undefined,
            reject
          )
        })
        loadPromises.push(promise)
      }
    }
  }

  await Promise.all(loadPromises)
}

/**
 * Preload moon view textures
 */
export async function preloadMoonViewTextures(
  types: PlanetType[] = [...PLANET_TYPES]
): Promise<void> {
  const loader = new TextureLoader()
  const loadPromises: Promise<Texture>[] = []

  for (const type of types) {
    const path = getMoonViewTexturePath(type)

    if (!textureCache.has(path)) {
      const promise = new Promise<Texture>((resolve, reject) => {
        loader.load(
          path,
          (texture) => {
            texture.colorSpace = SRGBColorSpace
            textureCache.set(path, texture)
            resolve(texture)
          },
          undefined,
          reject
        )
      })
      loadPromises.push(promise)
    }
  }

  await Promise.all(loadPromises)
}

/**
 * Get cached texture if available
 */
export function getCachedTexture(path: string): Texture | undefined {
  return textureCache.get(path)
}

/**
 * Clear texture cache to free memory
 */
export function clearTextureCache(): void {
  textureCache.forEach((texture) => {
    texture.dispose()
  })
  textureCache.clear()
}

/**
 * Get texture cache size for debugging
 */
export function getTextureCacheSize(): number {
  return textureCache.size
}

/**
 * Hook to preload textures on component mount
 */
export function usePreloadTextures(
  types: PlanetType[] = [...PLANET_TYPES],
  size: PlanetSize = 'medium'
): { loading: boolean; progress: number } {
  const totalTextures = types.length * 3 // 3 variants per type
  let loadedCount = 0

  useEffect(() => {
    preloadPlanetTextures(types, size, [1, 2, 3])
  }, [types, size])

  // Simplified loading state - in production, track actual progress
  return {
    loading: textureCache.size < totalTextures,
    progress: Math.min(1, textureCache.size / totalTextures),
  }
}

/**
 * Create a procedural noise texture for effects
 */
export function createNoiseTexture(size: number = 256): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const imageData = ctx.createImageData(size, size)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const value = Math.random() * 255
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)

  const texture = new Texture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.needsUpdate = true

  return texture
}
