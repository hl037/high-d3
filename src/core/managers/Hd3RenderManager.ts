import { Hd3Chart } from '../chart/Hd3Chart';
import type { RenderableI } from '../interfaces/RenderableI';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';

/**
 * Manager that handles rendering of objects on the chart.
 * Listens for 'addRenderer' and 'removeRenderer' events.
 */
export class Hd3RenderManager {
  private chart: Hd3Chart;
  private renderables: Map<RenderableI, boolean> = new Map();
  private chartBusEndpoint: Hd3BusEndpoint;

  constructor(chart: Hd3Chart) {
    this.chart = chart;
    
    // Connect to chart bus
    this.chartBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        addRenderer: (renderable: unknown) => this.handleAddRenderer(renderable),
        removeRenderer: (renderable: unknown) => this.handleRemoveRenderer(renderable)
      }
    });
    this.chartBusEndpoint.bus = this.chart.getBus();
    
    // Announce manager on the bus
    this.chart.emit('renderManagerChanged', this);
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
    this.chart.emit('renderManagerChanged', undefined);
    this.chartBusEndpoint.destroy();
    this.renderables.clear();
  }
}
