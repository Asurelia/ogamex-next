import { GameLoop, ECSSystem } from './GameLoop';
import { ClientECS } from './ecs/ClientECS';
import { InputManager } from './InputManager';
import { SceneManager } from './SceneManager';
import { AssetManager } from './AssetManager';

export interface NetworkBridge {
  send(event: string, data: unknown): void;
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
}

export interface GameEngineConfig {
  canvas?: HTMLElement;
}

let instance: GameEngine | null = null;

export class GameEngine {
  private gameLoop: GameLoop;
  private clientECS: ClientECS;
  private inputManager: InputManager;
  private sceneManager: SceneManager;
  private assetManager: AssetManager;
  private networkBridge: NetworkBridge | null = null;
  private systems: ECSSystem[] = [];
  private world: unknown | null = null;
  private initialized: boolean = false;
  private lastTime: number = 0;

  private constructor() {
    this.gameLoop = new GameLoop();
    this.clientECS = new ClientECS();
    this.inputManager = new InputManager();
    this.sceneManager = new SceneManager();
    this.assetManager = new AssetManager();
  }

  static getInstance(): GameEngine {
    if (!instance) {
      instance = new GameEngine();
    }
    return instance;
  }

  static destroyInstance(): void {
    if (instance) {
      instance.destroy();
      instance = null;
    }
  }

  init(config: GameEngineConfig = {}): void {
    if (this.initialized) return;

    this.world = this.clientECS.createWorld();

    if (config.canvas) {
      this.inputManager.init(config.canvas);
    }

    this.gameLoop.reset();
    this.lastTime = performance.now();
    this.initialized = true;
  }

  tick(dt: number): void {
    if (!this.initialized || !this.world) return;

    this.sceneManager.update(dt);
    this.gameLoop.update(dt, this.systems, this.world);
    this.inputManager.resetFrame();
  }

  tickFromTimestamp(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.25);
    this.lastTime = timestamp;
    this.tick(dt);
  }

  destroy(): void {
    if (!this.initialized) return;

    this.inputManager.destroy();
    this.sceneManager.destroy();
    this.assetManager.dispose();
    this.clientECS.destroy();
    this.gameLoop.reset();

    this.systems = [];
    this.networkBridge = null;
    this.world = null;
    this.initialized = false;
  }

  registerSystem(system: ECSSystem): void {
    if (!this.systems.includes(system)) {
      this.systems.push(system);
    }
  }

  unregisterSystem(system: ECSSystem): void {
    const idx = this.systems.indexOf(system);
    if (idx !== -1) this.systems.splice(idx, 1);
  }

  clearSystems(): void {
    this.systems = [];
  }

  setNetworkBridge(bridge: NetworkBridge): void {
    this.networkBridge = bridge;
  }

  getNetworkBridge(): NetworkBridge | null {
    return this.networkBridge;
  }

  getECS(): ClientECS {
    return this.clientECS;
  }

  getInput(): InputManager {
    return this.inputManager;
  }

  getScene(): SceneManager {
    return this.sceneManager;
  }

  getAssets(): AssetManager {
    return this.assetManager;
  }

  getWorld(): unknown | null {
    return this.world;
  }

  getAlpha(): number {
    return this.gameLoop.getAlpha();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getSystemCount(): number {
    return this.systems.length;
  }
}

export const getEngine = (): GameEngine => GameEngine.getInstance();
