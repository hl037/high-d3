import { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3XAxisRenderer } from '../axis/Hd3XAxisRenderer';
import { Hd3YAxisRenderer } from '../axis/Hd3YAxisRenderer';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import type { AxisRenderersState, GetAxisRenderersCallback } from './managerInterfaces';

/**
 * Manager that keeps track of axis renderers added to the chart.
 */
export class Hd3AxisManager {
  private chart: Hd3Chart;
  private xAxisRenderers: Map<string, Hd3XAxisRenderer> = new Map();
  private yAxisRenderers: Map<string, Hd3YAxisRenderer> = new Map();
  private chartBusEndpoint: Hd3BusEndpoint;

  constructor(chart: Hd3Chart) {
    this.chart = chart;
    
    this.chartBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        addXAxisRenderer: (renderer: unknown) => this.handleAddXAxisRenderer(renderer),
        removeXAxisRenderer: (renderer: unknown) => this.handleRemoveXAxisRenderer(renderer),
        addYAxisRenderer: (renderer: unknown) => this.handleAddYAxisRenderer(renderer),
        removeYAxisRenderer: (renderer: unknown) => this.handleRemoveYAxisRenderer(renderer),
        getAxisRenderers: (callback: unknown) => this.handleGetAxisRenderers(callback)
      }
    });
    this.chartBusEndpoint.bus = this.chart.getBus();
  }

  private handleAddXAxisRenderer(renderer: unknown): void {
    if (renderer instanceof Hd3XAxisRenderer) {
      this.xAxisRenderers.set(renderer.name, renderer);
      this.notifyAxisRenderersChanged();
    }
  }

  private handleRemoveXAxisRenderer(renderer: unknown): void {
    if (renderer instanceof Hd3XAxisRenderer) {
      this.xAxisRenderers.delete(renderer.name);
      this.notifyAxisRenderersChanged();
    }
  }

  private handleAddYAxisRenderer(renderer: unknown): void {
    if (renderer instanceof Hd3YAxisRenderer) {
      this.yAxisRenderers.set(renderer.name, renderer);
      this.notifyAxisRenderersChanged();
    }
  }

  private handleRemoveYAxisRenderer(renderer: unknown): void {
    if (renderer instanceof Hd3YAxisRenderer) {
      this.yAxisRenderers.delete(renderer.name);
      this.notifyAxisRenderersChanged();
    }
  }

  private handleGetAxisRenderers(callback: unknown): void {
    if (callback && typeof callback === 'object' && 'setAxisRenderers' in callback) {
      const cb = callback as GetAxisRenderersCallback;
      cb.setAxisRenderers(this.getAxisRenderersState());
    }
  }

  private notifyAxisRenderersChanged(): void {
    this.chart.emit('axisRenderersListChanged', this.getAxisRenderersState());
  }

  private getAxisRenderersState(): AxisRenderersState {
    return {
      x: Array.from(this.xAxisRenderers.values()),
      y: Array.from(this.yAxisRenderers.values())
    };
  }

  getXAxisRenderers(): Hd3XAxisRenderer[] {
    return Array.from(this.xAxisRenderers.values());
  }

  getYAxisRenderers(): Hd3YAxisRenderer[] {
    return Array.from(this.yAxisRenderers.values());
  }

  getXAxisRendererByName(name: string): Hd3XAxisRenderer | undefined {
    return this.xAxisRenderers.get(name);
  }

  getYAxisRendererByName(name: string): Hd3YAxisRenderer | undefined {
    return this.yAxisRenderers.get(name);
  }

  destroy(): void {
    this.chartBusEndpoint.destroy();
    this.xAxisRenderers.clear();
    this.yAxisRenderers.clear();
  }
}
