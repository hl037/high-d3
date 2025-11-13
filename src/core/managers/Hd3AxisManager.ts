import { Hd3Chart } from '../chart/Hd3Chart';
import type { AxesState, GetAxisManagerCallback } from './managerInterfaces';
import { Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3Axis } from '../axis/Hd3Axis';

export type Hd3AxisManagerEvents = {
  addAxis: Hd3Axis,
  removeAxis: Hd3Axis,
  getAxisManager: GetAxisManagerCallback,
  axesListChanged: AxesState,
  axisManagerChanged: Hd3AxisManager | undefined,
}

/**
 * Manager that keeps track of axis renderers added to the chart.
 */
export class Hd3AxisManager {
  private chart: Hd3Chart;
  private xAxes: Map<string, Hd3Axis> = new Map();
  private yAxes: Map<string, Hd3Axis> = new Map();
  public readonly e: Hd3EventNameMap<Hd3AxisManagerEvents>;

  constructor(chart: Hd3Chart) {
    this.chart = chart;
    this.handleAddAxis = this.handleAddAxis.bind(this);
    this.handleRemoveAxis = this.handleRemoveAxis.bind(this);
    this.handleGetAxisManager = this.handleGetAxisManager.bind(this)
    const bus = this.chart.bus;

    this.e = {
      addAxis:             chart.e<Hd3AxisManagerEvents>()('addAxis'),
      removeAxis:          chart.e<Hd3AxisManagerEvents>()('removeAxis'),
      getAxisManager:       chart.e<Hd3AxisManagerEvents>()('getAxisManager'),
      axesListChanged:      chart.e<Hd3AxisManagerEvents>()('axesListChanged'),
      axisManagerChanged:   chart.e<Hd3AxisManagerEvents>()('axisManagerChanged'),
    }


    bus.on(this.e.addAxis, this.handleAddAxis.bind(this));
    bus.on(this.e.removeAxis, this.handleRemoveAxis.bind(this));
    bus.on(this.e.getAxisManager, this.handleGetAxisManager.bind(this));
    bus.on(chart.e.destroyed, this.destroy.bind(this));

    // Announce manager on the bus
    bus.emit(chart.e<Hd3AxisManagerEvents>()('axisManagerChanged'), this);
  }

  private handleAddAxis(axis: unknown): void {
    if (axis instanceof Hd3Axis) {
      this.xAxes.set(axis.name, axis);
      this.notifyAxesChanged();
    }
  }

  private handleRemoveAxis(axis: unknown): void {
    if (axis instanceof Hd3Axis) {
      this.xAxes.delete(axis.name);
      this.notifyAxesChanged();
    }
  }

  private handleGetAxisManager(callback: GetAxisManagerCallback): void {
    callback.setAxisManager(this);
  }

  private notifyAxesChanged(): void {
    this.chart.bus.emit(this.chart.e<Hd3AxisManagerEvents>()('axesListChanged'), this.getAxesState());
  }

  private getAxesState(): AxesState {
    return {
      x: [...this.xAxes.values()],
      y: [...this.yAxes.values()]
    };
  }

  getXAxes(): Hd3Axis[] {
    return [...this.xAxes.values()];
  }

  getYAxes(): Hd3Axis[] {
    return [...this.yAxes.values()];
  }

  getXAxis(name: string): Hd3Axis | undefined {
    return this.xAxes.get(name);
  }

  getYAxis(name: string): Hd3Axis | undefined {
    return this.yAxes.get(name);
  }

  destroy(): void {
    this.chart.bus.emit(this.chart.e<Hd3AxisManagerEvents>()('axisManagerChanged'), undefined);
    (this as any).chart = undefined;
    (this as any).xAxes = undefined;
    (this as any).yAxes = undefined;
  }
}
