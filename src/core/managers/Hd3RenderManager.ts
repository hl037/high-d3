import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3DynamicEventNameMap, Hd3Event, Hd3EventNameMap } from '../bus/Hd3Bus';

export interface Hd3RenderTargetI {
  getRenderTarget: () => d3.Selection<SVGGElement, unknown, null, undefined>;
  e:Hd3DynamicEventNameMap<{
    destroyed: Hd3RenderTargetI;
  }>
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface Hd3RenderableI<T> {
  render: (target: T) => void;
}

export interface DirtyEvent<T> {
  target: T;
  renderable: Hd3RenderableI<T>;
}

export interface  Hd3RenderManagerEvents{
  dirty: DirtyEvent<unknown>;
}

export interface Hd3RenderManagerOptions {
  bus?: Hd3Bus;
}

export const dirty = createHd3Event<DirtyEvent<unknown>>('render-manager.dirty')
export function emitDirty<T>(bus:Hd3Bus, event:DirtyEvent<T>) {
  bus.emit(dirty, event as DirtyEvent<unknown>);
}
export const render = createHd3Event<null>()

/**
 * Manager that handles rendering of objects on the chart.
 */
export class Hd3RenderManager {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3RenderManagerEvents>;
  private dirtyList: Map<unknown, Set<Hd3RenderableI<unknown>>>;

  constructor(options: Hd3RenderManagerOptions) {
    this.handleDirty = this.handleDirty.bind(this);
    this.handleRender = this.handleRender.bind(this);
    this.bus = options.bus || getHd3GlobalBus();
    this.e = {
      dirty,
    }
    this.dirtyList = new Map();
    this.bus.on(this.e.dirty, this.handleDirty);
  }

  private handleDirty(dirty: DirtyEvent<unknown>): void {
    const needRender = this.dirtyList.size === 0; // INFO - 2025-11-19 -- hl037 : If dirtyList is not empty, a render has already been scheduled, so we don't need to schedule another one.
    let renderableSet = this.dirtyList.get(dirty.target);
    if(renderableSet === undefined) {
      renderableSet = new Set<Hd3RenderableI<unknown>>();
      this.dirtyList.set(dirty.target, renderableSet);
    }
    renderableSet!.add(dirty.renderable);
    if(needRender) {
      setTimeout(this.handleRender, 0);
    }
  }

  private handleRender(_:null){
    const dirtyList = this.dirtyList;
    this.dirtyList = new Map();
    for(const [target, renderableSet] of dirtyList){
      for(const renderable of renderableSet){
        renderable.render(target);
      }
    }
  }
}

// Global default singleton
let _globalRenderManager: Hd3RenderManager | null = null;

export function getHd3GlobalRenderManager(): Hd3RenderManager {
  if (!_globalRenderManager) {
    _globalRenderManager = new Hd3RenderManager({bus: getHd3GlobalBus()});
  }
  return _globalRenderManager;
}
