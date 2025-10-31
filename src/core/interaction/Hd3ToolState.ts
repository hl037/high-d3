import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';

export type ToolType = 'pan' | 'zoom-in' | 'zoom-out' | 'zoom-selection' | 'reset' | 'none';

/**
 * Bus with internal state that tracks the current active tool.
 */
export class Hd3ToolState {
  private bus: Hd3Bus;
  private _currentTool: ToolType = 'none';

  constructor() {
    this.bus = createHd3Bus();
  }

  get currentTool(): ToolType {
    return this._currentTool;
  }

  set currentTool(tool: ToolType) {
    const oldTool = this._currentTool;
    this._currentTool = tool;
    this.bus.emit('toolChanged', { old: oldTool, new: tool });
  }

  getBus(): Hd3Bus {
    return this.bus;
  }

  on(event: string, handler: (data?: unknown) => void): void {
    this.bus.on(event, handler);
  }

  off(event: string, handler: (data?: unknown) => void): void {
    this.bus.off(event, handler);
  }

  emit(event: string, data?: unknown): void {
    this.bus.emit(event, data);
  }

  /**
   * Notify new subscribers of current tool state
   */
  notifyCurrentState(): void {
    this.bus.emit('toolChanged', { old: this._currentTool, new: this._currentTool });
  }
}
