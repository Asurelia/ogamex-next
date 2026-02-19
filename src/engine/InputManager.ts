export interface MousePosition {
  x: number;
  y: number;
}

export type ActionBinding = string[];

const DEFAULT_BINDINGS: Record<string, ActionBinding> = {
  orbit: ['mouseright'],
  select: ['mouseleft'],
  zoomIn: ['wheelup'],
  zoomOut: ['wheeldown'],
  warp: ['KeyW'],
  dock: ['KeyD'],
  stop: ['KeyS'],
};

export class InputManager {
  private keysDown: Set<string> = new Set();
  private mouseButtons: Set<number> = new Set();
  private mousePos: MousePosition = { x: 0, y: 0 };
  private wheelDelta: number = 0;
  private actionBindings: Map<string, ActionBinding> = new Map();
  private canvas: HTMLElement | null = null;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundWheel = this.onWheel.bind(this);
  }

  init(canvas: HTMLElement): void {
    this.canvas = canvas;
    canvas.addEventListener('keydown', this.boundKeyDown as EventListener);
    canvas.addEventListener('keyup', this.boundKeyUp as EventListener);
    canvas.addEventListener('mousedown', this.boundMouseDown as EventListener);
    canvas.addEventListener('mouseup', this.boundMouseUp as EventListener);
    canvas.addEventListener('mousemove', this.boundMouseMove as EventListener);
    canvas.addEventListener('wheel', this.boundWheel as EventListener, { passive: true });

    for (const [action, keys] of Object.entries(DEFAULT_BINDINGS)) {
      this.actionBindings.set(action, keys);
    }

    if (!canvas.hasAttribute('tabindex')) {
      canvas.setAttribute('tabindex', '0');
    }
  }

  destroy(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener('keydown', this.boundKeyDown as EventListener);
    this.canvas.removeEventListener('keyup', this.boundKeyUp as EventListener);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown as EventListener);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp as EventListener);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove as EventListener);
    this.canvas.removeEventListener('wheel', this.boundWheel as EventListener);
    this.canvas = null;
    this.keysDown.clear();
    this.mouseButtons.clear();
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keysDown.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
  }

  private onMouseDown(e: MouseEvent): void {
    this.mouseButtons.add(e.button);
  }

  private onMouseUp(e: MouseEvent): void {
    this.mouseButtons.delete(e.button);
  }

  private onMouseMove(e: MouseEvent): void {
    this.mousePos.x = e.clientX;
    this.mousePos.y = e.clientY;
  }

  private onWheel(e: WheelEvent): void {
    this.wheelDelta += e.deltaY;
  }

  isKeyDown(key: string): boolean {
    return this.keysDown.has(key);
  }

  isActionActive(action: string): boolean {
    const bindings = this.actionBindings.get(action);
    if (!bindings) return false;

    for (const binding of bindings) {
      if (binding === 'mouseleft' && this.mouseButtons.has(0)) return true;
      if (binding === 'mousemiddle' && this.mouseButtons.has(1)) return true;
      if (binding === 'mouseright' && this.mouseButtons.has(2)) return true;
      if (binding === 'wheelup' && this.wheelDelta < 0) return true;
      if (binding === 'wheeldown' && this.wheelDelta > 0) return true;
      if (this.keysDown.has(binding)) return true;
    }

    return false;
  }

  getMousePosition(): Readonly<MousePosition> {
    return this.mousePos;
  }

  getWheelDelta(): number {
    return this.wheelDelta;
  }

  bind(action: string, keys: ActionBinding): void {
    this.actionBindings.set(action, keys);
  }

  unbind(action: string): void {
    this.actionBindings.delete(action);
  }

  resetFrame(): void {
    this.wheelDelta = 0;
  }

  getActiveKeys(): string[] {
    return Array.from(this.keysDown);
  }
}
