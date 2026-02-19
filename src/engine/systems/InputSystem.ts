import type { GameEngine } from '../GameEngine'
import { useRTGameStore } from '@/stores/rtGameStore'
import * as THREE from 'three'

let _camera: THREE.Camera | null = null
let _selectedEid: number = -1

export function setInputCamera(camera: THREE.Camera): void {
  _camera = camera
}

export function getSelectedEid(): number {
  return _selectedEid
}

export function inputSystem(engine: GameEngine, _dt: number): void {
  const input = engine.getInput()
  const store = useRTGameStore.getState()

  // Right mouse held -> orbit (camera drag delta consumed by CameraSystem via InputManager)
  // The CameraSystem reads InputManager directly, nothing extra needed here.

  // Left click -> select entity via raycast
  if (input.isActionActive('select') && _camera) {
    const mouse = input.getMousePosition()
    const canvas = (_camera as THREE.PerspectiveCamera & { domElement?: HTMLElement }).domElement

    let ndcX = 0
    let ndcY = 0

    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      ndcX = ((mouse.x - rect.left) / rect.width) * 2 - 1
      ndcY = -((mouse.y - rect.top) / rect.height) * 2 + 1
    }

    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2(ndcX, ndcY)
    raycaster.setFromCamera(ndc, _camera)

    const ecs = engine.getECS()
    const sessionIds = ecs.getAllSessionIds()

    let closestDist = Infinity
    let closestId: string | null = null

    for (const sid of sessionIds) {
      const eid = ecs.getEntity(sid)
      if (eid === undefined) continue

      const { Position } = require('../ecs/components')
      const pos = new THREE.Vector3(
        Position.x[eid],
        Position.y[eid],
        Position.z[eid]
      )

      const dist = raycaster.ray.distanceToPoint(pos)
      if (dist < 5000 && dist < closestDist) {
        closestDist = dist
        closestId = sid
        _selectedEid = eid
      }
    }

    if (closestId !== null) {
      store.setSelectedTarget(closestId)
    }
  }

  // 'warp' key pressed -> warp to selected target
  if (input.isActionActive('warp')) {
    const targetId = store.selectedTargetId
    if (targetId) {
      store.warpTo(targetId)
    }
  }
}
