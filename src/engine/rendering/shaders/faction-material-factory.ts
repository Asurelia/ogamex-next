import * as THREE from 'three'
import { getFaction } from '@/data/faction-identities'

export function createFactionMaterial(factionId: string): THREE.MeshStandardMaterial {
  const faction = getFaction(factionId)

  const color = new THREE.Color(faction.primaryColor)
  const emissive = new THREE.Color(faction.primaryColor).multiplyScalar(0.1)

  return new THREE.MeshStandardMaterial({
    color,
    metalness: faction.metalness,
    roughness: faction.roughness,
    emissive,
    emissiveIntensity: faction.emissiveIntensity,
    envMapIntensity: 1.0,
  })
}

export function getFactionInstanceColor(factionId: string): THREE.Color {
  const faction = getFaction(factionId)
  return new THREE.Color(faction.primaryColor)
}

export const FACTION_COLOR_PALETTE: THREE.Color[] = [
  new THREE.Color('#FFD700'), // amarr
  new THREE.Color('#3399FF'), // caldari
  new THREE.Color('#33CC66'), // gallente
  new THREE.Color('#CC6633'), // minmatar
  new THREE.Color('#FF3333'), // pirate
  new THREE.Color('#888888'), // npc
]
