'use client'

/**
 * Overview Page - Vue Orbitale
 *
 * Cette page n'a pas besoin de contenu car la vue 3D est gérée
 * par GameLayoutClient via Scene3DContent et GameScene3DManager.
 * La scène 'orbital' est automatiquement sélectionnée pour cette route.
 */
export default function OverviewPage() {
  // Cette page retourne null car le rendu 3D est géré par le layout
  // via Scene3DContent qui affiche GameScene3DManager avec scene='orbital'
  return null
}
