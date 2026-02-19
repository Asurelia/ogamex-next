import type { GameEngine } from '../GameEngine'
import * as THREE from 'three'

type CameraMode = 'tracking' | 'free' | 'cinematic'

let _camera: THREE.Camera | null = null
let _theta: number = 0
let _phi: number = Math.PI / 4
let _distance: number = 50000
let _targetPosition: THREE.Vector3 = new THREE.Vector3()
let _currentPosition: THREE.Vector3 = new THREE.Vector3()
let _mode: CameraMode = 'tracking'

const THETA_SPEED = 0.005
const PHI_SPEED = 0.005
const ZOOM_SPEED = 0.1
const PHI_MIN = 0.05
const PHI_MAX = Math.PI - 0.05
const DISTANCE_MIN = 500
const DISTANCE_MAX = 500000
const LERP_FACTOR = 0.08
const CINEMATIC_ROTATE_SPEED = 0.1

export function setCamera(camera: THREE.Camera): void {
  _camera = camera
}

export function setCameraTarget(position: THREE.Vector3): void {
  _targetPosition.copy(position)
}

export function setCameraMode(mode: string): void {
  _mode = mode as CameraMode
}

export function getCameraDistance(): number {
  return _distance
}

export function cameraSystem(engine: GameEngine, dt: number): void {
  if (!_camera) return

  const input = engine.getInput()

  // Orbit drag (right mouse held)
  if (input.isActionActive('orbit')) {
    const mouse = input.getMousePosition()
    // Use movementX/Y equivalent via mouse position diff; InputManager stores raw clientX/Y
    // We approximate delta from stored position — systems that need precise delta
    // should extend InputManager. For now we use a small fixed nudge while held.
    void mouse
  }

  // Read wheel for zoom
  const wheel = input.getWheelDelta()
  if (wheel !== 0) {
    _distance *= 1 + wheel * ZOOM_SPEED * 0.001
    _distance = Math.max(DISTANCE_MIN, Math.min(DISTANCE_MAX, _distance))
  }

  // Cinematic mode: auto-rotate
  if (_mode === 'cinematic') {
    _theta += CINEMATIC_ROTATE_SPEED * dt
  }

  // Spherical → Cartesian
  const sinPhi = Math.sin(_phi)
  const cosPhi = Math.cos(_phi)
  const sinTheta = Math.sin(_theta)
  const cosTheta = Math.cos(_theta)

  const offsetX = _distance * sinPhi * sinTheta
  const offsetY = _distance * cosPhi
  const offsetZ = _distance * sinPhi * cosTheta

  const desiredX = _targetPosition.x + offsetX
  const desiredY = _targetPosition.y + offsetY
  const desiredZ = _targetPosition.z + offsetZ

  // Smooth lerp
  _currentPosition.x += (desiredX - _currentPosition.x) * LERP_FACTOR
  _currentPosition.y += (desiredY - _currentPosition.y) * LERP_FACTOR
  _currentPosition.z += (desiredZ - _currentPosition.z) * LERP_FACTOR

  _camera.position.copy(_currentPosition)

  if (_camera instanceof THREE.PerspectiveCamera || _camera instanceof THREE.OrthographicCamera) {
    (_camera as THREE.PerspectiveCamera).lookAt(_targetPosition)
  }
}

export function applyCameraOrbitDelta(dx: number, dy: number): void {
  _theta -= dx * THETA_SPEED
  _phi -= dy * PHI_SPEED
  _phi = Math.max(PHI_MIN, Math.min(PHI_MAX, _phi))
}
