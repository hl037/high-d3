import { Hd3Chart } from '../chart/Hd3Chart';
import type { RenderableI } from '../interfaces/RenderableI';

export type Hd3RenderManagerEvents = {
  addRenderer: RenderableI,
  removeRenderer: RenderableI,
  renderManagerChanged: Hd3RenderManager | undefined,
}

/**
 * Manager that handles rendering of objects on the chart.
 */
export class Hd3RenderManager {
  private chart: Hd3Chart;
  private renderables: Map<RenderableI, boolean> = new Map();

  constructor(chart: Hd3Chart) {
    this.chart = chart;

    const bus = this.chart.bus;

    bus.on(chart.e<Hd3RenderManagerEvents>()('addRenderer'), this.handleAddRenderer.bind(this));
    bus.on(chart.e<Hd3RenderManagerEvents>()('removeRenderer'), this.handleRemoveRenderer.bind(this));
    bus.on(chart.e.destroyed, this.destroy.bind(this));

    // Announce manager on the bus
    bus.emit(chart.e<Hd3RenderManagerEvents>()('renderManagerChanged'), this);
  }

  private handleAddRenderer(renderable: unknown): void {
    if (this.isRenderable(renderable)) {
      this.renderables.set(renderable, true);
      renderable.render(this.chart);
    }
  }

  private handleRemoveRenderer(renderable: unknown): void {
    if (this.isRenderable(renderable)) {
      this.renderables.delete(renderable);
      if ('destroy' in renderable && typeof renderable.destroy === 'function') {
        renderable.destroy();
      }
    }
  }

  private isRenderable(obj: unknown): obj is RenderableI {
    return typeof obj === 'object' && obj !== null && 'render' in obj;
  }

  destroy(): void {
    this.chart.bus.emit(this.chart.e<Hd3RenderManagerEvents>()('renderManagerChanged'), undefined);
    (this as any).chart = undefined;
    (this as any).renderables = undefined;
  }
}
