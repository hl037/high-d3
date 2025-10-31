import { Hd3Chart } from '../chart/Hd3Chart';
import type { RenderableI } from '../interfaces/RenderableI';

/**
 * Manager that handles rendering of objects on the chart.
 * Listens for 'addRenderer' events and calls render() on renderable objects.
 */
export class Hd3RenderManager {
  private chart: Hd3Chart;
  private renderables: Set<RenderableI> = new Set();

  constructor(chart: Hd3Chart) {
    this.chart = chart;
    this.chart.on('addRenderer', this.handleAddRenderer.bind(this));
  }

  private handleAddRenderer(renderable: unknown): void {
    if (this.isRenderable(renderable)) {
      this.renderables.add(renderable);
      renderable.render(this.chart);
    }
  }

  private isRenderable(obj: unknown): obj is RenderableI {
    return typeof obj === 'object' && obj !== null && 'render' in obj;
  }

  destroy(): void {
    this.renderables.clear();
  }
}
