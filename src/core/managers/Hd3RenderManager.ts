import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3Event, Hd3EventNameMap } from '../bus/Hd3Bus';

export interface Hd3RenderTargetI {
  getRenderTarget: () => d3.Selection<SVGGElement, unknown, null, undefined>;
  e:{
    destroyed: Hd3Event<Hd3RenderTargetI>;
  }
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
}

export interface Hd3RenderableI {
  render: (target: Hd3RenderTargetI) => void;
}

export interface DirtyEvent {
  target: Hd3RenderTargetI;
  renderable: Hd3RenderableI;
}

export interface  Hd3RenderManagerEvents{
  dirty: DirtyEvent;
  render: null;
}

export interface Hd3RenderManagerOptions {
  bus?: Hd3Bus;
}

export const dirty = createHd3Event<DirtyEvent>()
export const render = createHd3Event<null>()

/**
 * Manager that handles rendering of objects on the chart.
 */
export class Hd3RenderManager {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3RenderManagerEvents>;
  private dirtyList: Map<Hd3RenderTargetI, Set<Hd3RenderableI>>;

  constructor(options: Hd3RenderManagerOptions) {
    this.handleDirty = this.handleDirty.bind(this);
    this.handleRender = this.handleRender.bind(this);
    this.bus = options.bus || getHd3GlobalBus();
    this.e = {
      dirty,
      render,
    }
    this.dirtyList = new Map();
    this.bus.on(this.e.dirty, this.handleDirty);

    
  }

  private handleDirty(dirty: DirtyEvent): void {
    let renderableSet = this.dirtyList.get(dirty.target);
    if(renderableSet === undefined) {
      renderableSet = new Set<Hd3RenderableI>();
      this.dirtyList.set(dirty.target, renderableSet);
    }
    renderableSet!.add(dirty.renderable);
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
