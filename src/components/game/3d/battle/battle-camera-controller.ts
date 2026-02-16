/**
 * Battle Camera Controller
 *
 * Camera controller for cinematic battle shots with GSAP animations.
 * Extracted from BattleAnimationEngine.ts for maintainability.
 */

import { gsap } from 'gsap'
import * as THREE from 'three'

/**
 * Camera controller for cinematic battle shots
 */
export class CameraController {
  private camera: THREE.Camera
  private scene: THREE.Scene
  private originalPosition: THREE.Vector3
  private originalQuaternion: THREE.Quaternion
  private currentTween: gsap.core.Tween | null = null
  private shakeOffset: THREE.Vector3 = new THREE.Vector3()
  private isShaking: boolean = false

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera
    this.scene = scene
    this.originalPosition = camera.position.clone()
    this.originalQuaternion = camera.quaternion.clone()
  }

  /**
   * Move camera to overview position
   */
  moveToOverview(duration: number): void {
    this.killCurrentTween()

    // Calculate center of battle
    const center = new THREE.Vector3(0, 0, 0)
    const distance = 50

    const position = new THREE.Vector3(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7
    )

    this.animateTo(position, center, duration, 'power2.inOut')
  }

  /**
   * Follow a projectile from source to target
   */
  followProjectile(source: THREE.Vector3, target: THREE.Vector3, duration: number): void {
    this.killCurrentTween()

    // Position camera to the side of the projectile path
    const midpoint = new THREE.Vector3().addVectors(source, target).multiplyScalar(0.5)
    const direction = new THREE.Vector3().subVectors(target, source).normalize()

    // Calculate perpendicular offset
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize()
    const offset = 10

    const position = new THREE.Vector3()
      .copy(midpoint)
      .add(perpendicular.multiplyScalar(offset))
      .add(new THREE.Vector3(0, 5, 0))

    this.animateTo(position, midpoint, duration, 'power1.out')
  }

  /**
   * Wide shot for multiple explosions
   */
  wideExplosionShot(duration: number): void {
    this.killCurrentTween()

    const position = new THREE.Vector3(0, 80, 80)
    const lookAt = new THREE.Vector3(0, 0, 0)

    this.animateTo(position, lookAt, duration, 'power2.out')
  }

  /**
   * Close-up shot on a specific ship
   */
  shipCloseup(shipPosition: THREE.Vector3, duration: number): void {
    this.killCurrentTween()

    const offset = new THREE.Vector3(5, 3, 5)
    const position = shipPosition.clone().add(offset)

    this.animateTo(position, shipPosition, duration, 'power2.inOut')
  }

  /**
   * Dramatic angle shot
   */
  dramaticAngle(center: THREE.Vector3, duration: number): void {
    this.killCurrentTween()

    const position = new THREE.Vector3(
      center.x + 30,
      center.y + 10,
      center.z - 30
    )

    this.animateTo(position, center, duration, 'power1.inOut')
  }

  /**
   * Apply camera shake
   */
  shake(intensity: number, duration: number): void {
    if (this.isShaking) return

    this.isShaking = true
    const startTime = performance.now()
    const originalPos = this.camera.position.clone()

    const shakeLoop = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed >= duration) {
        this.camera.position.copy(originalPos)
        this.isShaking = false
        return
      }

      const decay = 1 - elapsed / duration
      const currentIntensity = intensity * decay

      this.shakeOffset.set(
        (Math.random() - 0.5) * currentIntensity * 2,
        (Math.random() - 0.5) * currentIntensity * 2,
        (Math.random() - 0.5) * currentIntensity * 2
      )

      this.camera.position.copy(originalPos).add(this.shakeOffset)

      requestAnimationFrame(shakeLoop)
    }

    requestAnimationFrame(shakeLoop)
  }

  /**
   * Reset camera to original position
   */
  reset(duration: number = 1.0): void {
    this.killCurrentTween()

    const lookAt = new THREE.Vector3(0, 0, 0)
    this.animateTo(this.originalPosition.clone(), lookAt, duration, 'power2.inOut')
  }

  /**
   * Get camera reference
   */
  getCamera(): THREE.Camera {
    return this.camera
  }

  /**
   * Check if camera is currently animating
   */
  isAnimating(): boolean {
    return this.currentTween !== null && this.currentTween.isActive()
  }

  /**
   * Animate camera to position
   */
  private animateTo(
    position: THREE.Vector3,
    lookAt: THREE.Vector3,
    duration: number,
    ease: string
  ): void {
    // Calculate target quaternion
    const tempCamera = this.camera.clone()
    tempCamera.position.copy(position)
    tempCamera.lookAt(lookAt)
    const targetQuaternion = tempCamera.quaternion.clone()

    const startPos = this.camera.position.clone()
    const startQuat = this.camera.quaternion.clone()

    const progress = { value: 0 }

    this.currentTween = gsap.to(progress, {
      value: 1,
      duration,
      ease,
      onUpdate: () => {
        this.camera.position.lerpVectors(startPos, position, progress.value)
        this.camera.quaternion.slerpQuaternions(startQuat, targetQuaternion, progress.value)
      },
    })
  }

  /**
   * Kill current camera animation
   */
  private killCurrentTween(): void {
    if (this.currentTween) {
      this.currentTween.kill()
      this.currentTween = null
    }
  }

  /**
   * Dispose camera controller
   */
  dispose(): void {
    this.killCurrentTween()
  }
}
