import { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3XAxis } from '../axis/Hd3XAxis';
import { Hd3YAxis } from '../axis/Hd3YAxis';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import type { AxesState, GetAxesCallback, GetAxisManagerCallback } from './managerInterfaces';

/**
 * Manager that keeps track of axis renderers added to the chart.
 */
export class Hd3AxisManager {
  private chart: Hd3Chart;
  private xAxes: Map<string, Hd3XAxis> = new Map();
  private yAxes: Map<string, Hd3YAxis> = new Map();
  private chartBusEndpoint: Hd3BusEndpoint;

  constructor(chart: Hd3Chart) {
    this.chart = chart;
    
    this.chartBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        addXAxis: (renderer: unknown) => this.handleAddXAxis(renderer),
        removeXAxis: (renderer: unknown) => this.handleRemoveXAxis(renderer),
        addYAxis: (renderer: unknown) => this.handleAddYAxis(renderer),
        removeYAxis: (renderer: unknown) => this.handleRemoveYAxis(renderer),
        getAxisManager: (callback: unknown) => this.handleGetAxisManager(callback)
      }
    });
    this.chartBusEndpoint.bus = this.chart.getBus();
    
    // Announce manager on the bus
    this.chart.emit('addAxisManager', this);
  }

  private handleAddXAxis(renderer: unknown): void {
    if (renderer instanceof Hd3XAxis) {
      this.xAxes.set(renderer.name, renderer);
      this.notifyAxesChanged();
    }
  }

  private handleRemoveXAxis(renderer: unknown): void {
    if (renderer instanceof Hd3XAxis) {
      this.xAxes.delete(renderer.name);
      this.notifyAxesChanged();
    }
  }

  private handleAddYAxis(renderer: unknown): void {
    if (renderer instanceof Hd3YAxis) {
      this.yAxes.set(renderer.name, renderer);
      this.notifyAxesChanged();
    }
  }

  private handleRemoveYAxis(renderer: unknown): void {
    if (renderer instanceof Hd3YAxis) {
      this.yAxes.delete(renderer.name);
      this.notifyAxesChanged();
    }
  }

  private handleGetAxisManager(callback: unknown): void {
    if (callback && typeof callback === 'object' && 'setAxisManager' in callback) {
      const cb = callback as GetAxisManagerCallback;
      cb.setAxisManager(this);
    }
  }

  private notifyAxesChanged(): void {
    this.chart.emit('axesListChanged', this.getAxesState());
  }

  private getAxesState(): AxesState {
    return {
      x: Array.from(this.xAxes.values()),
      y: Array.from(this.yAxes.values())
    };
  }

  getXAxes(): Hd3XAxis[] {
    return Array.from(this.xAxes.values());
  }

  getYAxes(): Hd3YAxis[] {
    return Array.from(this.yAxes.values());
  }

  getXAxisByName(name: string): Hd3XAxis | undefined {
    return this.xAxes.get(name);
  }

  getYAxisByName(name: string): Hd3YAxis | undefined {
    return this.yAxes.get(name);
  }

  getXAxis(name: string): Hd3XAxis | undefined {
    return this.xAxes.get(name);
  }

  getYAxis(name: string): Hd3YAxis | undefined {
    return this.yAxes.get(name);
  }

  destroy(): void {
    this.chart.emit('removeAxisManager', this);
    this.chartBusEndpoint.destroy();
    this.xAxes.clear();
    this.yAxes.clear();
  }
}
