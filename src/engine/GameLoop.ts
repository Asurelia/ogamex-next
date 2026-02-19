export const FIXED_DT = 1 / 60;
export const MAX_FRAME_TIME = 0.25;

export interface ECSSystem {
  execute(world: unknown, dt: number): void;
}

export class GameLoop {
  private accumulator: number = 0;
  public alpha: number = 0;
  private tickCount: number = 0;

  get currentTick(): number {
    return this.tickCount;
  }

  update(dt: number, systems: ECSSystem[], world: unknown): void {
    const frameDt = Math.min(dt, MAX_FRAME_TIME);
    this.accumulator += frameDt;

    while (this.accumulator >= FIXED_DT) {
      for (let i = 0; i < systems.length; i++) {
        systems[i].execute(world, FIXED_DT);
      }
      this.accumulator -= FIXED_DT;
      this.tickCount++;
    }

    this.alpha = this.accumulator / FIXED_DT;
  }

  getAlpha(): number {
    return this.alpha;
  }

  reset(): void {
    this.accumulator = 0;
    this.alpha = 0;
    this.tickCount = 0;
  }
}
