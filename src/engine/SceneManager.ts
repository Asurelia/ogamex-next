import * as THREE from 'three';

export type LayerName = 'background' | 'midground' | 'foreground';

export interface TransitionOptions {
  duration?: number;
  onComplete?: () => void;
}

const LAYER_NAMES: LayerName[] = ['background', 'midground', 'foreground'];

export class SceneManager {
  private parentScene: THREE.Scene | null = null;
  private layers: Map<LayerName, THREE.Group> = new Map();
  private isTransitioning: boolean = false;
  private transitionMesh: THREE.Mesh | null = null;
  private transitionProgress: number = 0;
  private transitionDuration: number = 1.0;
  private transitionCallback: (() => void) | null = null;
  private transitionPhase: 'fadeOut' | 'swap' | 'fadeIn' | 'idle' = 'idle';
  private pendingSwap: (() => void) | null = null;

  init(parentScene: THREE.Scene): void {
    this.parentScene = parentScene;

    for (const name of LAYER_NAMES) {
      const group = new THREE.Group();
      group.name = `layer_${name}`;
      this.layers.set(name, group);
      parentScene.add(group);
    }
  }

  getLayer(name: LayerName): THREE.Group {
    const layer = this.layers.get(name);
    if (!layer) {
      throw new Error(`SceneManager: layer '${name}' not found. Call init() first.`);
    }
    return layer;
  }

  clearLayer(name: LayerName): void {
    const layer = this.getLayer(name);
    const toRemove: THREE.Object3D[] = [];

    layer.traverse((child) => {
      if (child !== layer) toRemove.push(child);
    });

    for (const obj of toRemove) {
      if (obj.parent === layer) {
        layer.remove(obj);
        this.disposeObject(obj);
      }
    }
  }

  clearAllLayers(): void {
    for (const name of LAYER_NAMES) {
      this.clearLayer(name);
    }
  }

  transition(
    fromSystem: string,
    toSystem: string,
    options: TransitionOptions = {}
  ): void {
    if (this.isTransitioning) return;

    this.isTransitioning = true;
    this.transitionDuration = options.duration ?? 1.0;
    this.transitionCallback = options.onComplete ?? null;
    this.transitionProgress = 0;
    this.transitionPhase = 'fadeOut';
    this.pendingSwap = null;

    if (this.parentScene) {
      this.createFadeOverlay();
    }

    void fromSystem;
    void toSystem;
  }

  update(dt: number): void {
    if (!this.isTransitioning) return;

    const halfDuration = this.transitionDuration / 2;
    this.transitionProgress += dt;

    if (this.transitionPhase === 'fadeOut') {
      const t = Math.min(this.transitionProgress / halfDuration, 1);
      this.setOverlayOpacity(t);

      if (this.transitionProgress >= halfDuration) {
        this.transitionPhase = 'fadeIn';
        this.transitionProgress = 0;

        if (this.pendingSwap) {
          this.pendingSwap();
          this.pendingSwap = null;
        }
      }
    } else if (this.transitionPhase === 'fadeIn') {
      const t = 1 - Math.min(this.transitionProgress / halfDuration, 1);
      this.setOverlayOpacity(t);

      if (this.transitionProgress >= halfDuration) {
        this.finishTransition();
      }
    }
  }

  private createFadeOverlay(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    this.transitionMesh = new THREE.Mesh(geometry, material);
    this.transitionMesh.renderOrder = 9999;
    this.transitionMesh.frustumCulled = false;
    this.parentScene?.add(this.transitionMesh);
  }

  private setOverlayOpacity(opacity: number): void {
    if (!this.transitionMesh) return;
    const mat = this.transitionMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity;
  }

  private finishTransition(): void {
    if (this.transitionMesh && this.parentScene) {
      this.parentScene.remove(this.transitionMesh);
      this.disposeObject(this.transitionMesh);
      this.transitionMesh = null;
    }
    this.isTransitioning = false;
    this.transitionPhase = 'idle';
    this.transitionProgress = 0;

    if (this.transitionCallback) {
      this.transitionCallback();
      this.transitionCallback = null;
    }
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }

  isInTransition(): boolean {
    return this.isTransitioning;
  }

  destroy(): void {
    this.clearAllLayers();

    if (this.transitionMesh && this.parentScene) {
      this.parentScene.remove(this.transitionMesh);
      this.disposeObject(this.transitionMesh);
      this.transitionMesh = null;
    }

    if (this.parentScene) {
      for (const layer of this.layers.values()) {
        this.parentScene.remove(layer);
      }
    }

    this.layers.clear();
    this.parentScene = null;
    this.isTransitioning = false;
    this.transitionCallback = null;
  }
}
