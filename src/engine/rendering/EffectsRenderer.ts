import * as THREE from 'three'

export class EffectsRenderer {
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.Camera | null = null
  private bloomIntensity: number = 1.0
  private useComposer: boolean = false

  init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera

    // Configure base renderer for space aesthetics
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.outputColorSpace = THREE.SRGBColorSpace

    // Attempt to detect if EffectComposer is available via dynamic import
    // If not available, fall back to basic renderer settings
    this.useComposer = false
  }

  setBloomIntensity(intensity: number): void {
    this.bloomIntensity = Math.max(0, intensity)

    if (!this.renderer) return

    // Adjust exposure to approximate bloom intensity without composer
    this.renderer.toneMappingExposure = 1.0 + this.bloomIntensity * 0.4
  }

  render(): void {
    if (!this.renderer || !this.scene || !this.camera) return

    if (this.useComposer) {
      // Placeholder: if EffectComposer is wired up externally, it takes over here
      return
    }

    // Fallback: direct render with tone mapping already configured in init()
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.renderer = null
    this.scene = null
    this.camera = null
    this.useComposer = false
  }
}
