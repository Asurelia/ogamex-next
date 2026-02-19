import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';

export interface AssetManifest {
  models: string[];
  textures: string[];
}

export interface LoadingProgress {
  loaded: number;
  total: number;
}

interface PoolEntry {
  template: THREE.Object3D;
  pool: THREE.Object3D[];
}

export class AssetManager {
  private gltfCache: Map<string, GLTF> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loadingProgress: LoadingProgress = { loaded: 0, total: 0 };
  private meshPool: Map<string, PoolEntry> = new Map();
  private gltfLoader: GLTFLoader;
  private textureLoader: TextureLoader;
  private pendingLoads: Map<string, Promise<GLTF | THREE.Texture>> = new Map();

  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new TextureLoader();
  }

  async preload(manifest: AssetManifest): Promise<void> {
    const allPaths = [
      ...manifest.models.map((p) => ({ path: p, type: 'gltf' as const })),
      ...manifest.textures.map((p) => ({ path: p, type: 'texture' as const })),
    ];

    this.loadingProgress.total += allPaths.length;

    const tasks = allPaths.map(async ({ path, type }) => {
      try {
        if (type === 'gltf') {
          await this.loadGLTF(path);
        } else {
          await this.loadTexture(path);
        }
      } catch (err) {
        console.warn(`AssetManager: failed to preload '${path}':`, err);
      } finally {
        this.loadingProgress.loaded++;
      }
    });

    await Promise.all(tasks);
  }

  async loadGLTF(path: string): Promise<GLTF> {
    if (this.gltfCache.has(path)) {
      return this.gltfCache.get(path)!;
    }

    if (this.pendingLoads.has(path)) {
      return this.pendingLoads.get(path)! as Promise<GLTF>;
    }

    const promise = new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          this.gltfCache.set(path, gltf);
          this.pendingLoads.delete(path);
          resolve(gltf);
        },
        undefined,
        (err) => {
          this.pendingLoads.delete(path);
          reject(err);
        }
      );
    });

    this.pendingLoads.set(path, promise);
    return promise;
  }

  async loadTexture(path: string): Promise<THREE.Texture> {
    if (this.textureCache.has(path)) {
      return this.textureCache.get(path)!;
    }

    if (this.pendingLoads.has(path)) {
      return this.pendingLoads.get(path)! as Promise<THREE.Texture>;
    }

    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => {
          this.textureCache.set(path, texture);
          this.pendingLoads.delete(path);
          resolve(texture);
        },
        undefined,
        (err) => {
          this.pendingLoads.delete(path);
          reject(err);
        }
      );
    });

    this.pendingLoads.set(path, promise);
    return promise;
  }

  getGLTF(path: string): GLTF | undefined {
    return this.gltfCache.get(path);
  }

  getTexture(path: string): THREE.Texture | undefined {
    return this.textureCache.get(path);
  }

  getProgress(): Readonly<LoadingProgress> {
    return this.loadingProgress;
  }

  acquireFromPool(key: string): THREE.Object3D | null {
    const entry = this.meshPool.get(key);
    if (!entry) return null;

    if (entry.pool.length > 0) {
      const obj = entry.pool.pop()!;
      obj.visible = true;
      return obj;
    }

    const clone = entry.template.clone();
    return clone;
  }

  releaseToPool(key: string, obj: THREE.Object3D): void {
    const entry = this.meshPool.get(key);
    if (!entry) return;
    obj.visible = false;
    entry.pool.push(obj);
  }

  registerPoolTemplate(key: string, template: THREE.Object3D): void {
    if (this.meshPool.has(key)) return;
    this.meshPool.set(key, { template, pool: [] });
  }

  dispose(): void {
    for (const gltf of this.gltfCache.values()) {
      gltf.scene.traverse((child) => {
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
    this.gltfCache.clear();

    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();

    for (const entry of this.meshPool.values()) {
      entry.pool.forEach((obj) => {
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
      });
    }
    this.meshPool.clear();

    this.pendingLoads.clear();
    this.loadingProgress = { loaded: 0, total: 0 };
  }
}
