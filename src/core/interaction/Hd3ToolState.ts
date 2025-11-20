import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3EventNameMap } from '../bus/Hd3Bus';

export interface ToolChangedEvent{
  old: ToolType;
  new: ToolType;
}

export interface Hd3ToolStateEvents{
  toolChanged: ToolChangedEvent;
}


export interface Hd3ToolStateOptions{
  bus?: Hd3Bus;
}

export type ToolType = 'pan' | 'zoom-in' | 'zoom-out' | 'zoom-selection' | 'reset' | 'none';

/**
 * Bus with internal state that tracks the current active tool.
 */
export class Hd3ToolState {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3ToolStateEvents>;
  private _currentTool: ToolType = 'none';

  constructor(options:Hd3ToolStateOptions) {
    this.bus = options.bus || getHd3GlobalBus();

    this.e = {
      toolChanged: createHd3Event<ToolChangedEvent>(),
    }
  }

  get currentTool(): ToolType {
    return this._currentTool;
  }

  set currentTool(tool: ToolType) {
    const oldTool = this._currentTool;
    this._currentTool = tool;
    this.bus.emit(this.e.toolChanged, { old: oldTool, new: tool });
  }

  getBus(): Hd3Bus {
    return this.bus;
  }

  /**
   * Notify new subscribers of current tool state
   */
  notifyCurrentState(): void {
    this.bus.emit(this.e.toolChanged, { old: this._currentTool, new: this._currentTool });
  }
}
