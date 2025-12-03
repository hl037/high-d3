/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3DynamicEventNameMapProvider, Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3Axis } from '../axis/Hd3Axis';


export interface AxesState {
  x: Hd3Axis[];
  y: Hd3Axis[];
}

export interface GetAxisManagerCallback {
  (manager: Hd3AxisManager): void;
}

export interface  Hd3AxisManagerChangedEvent{
  provider: Hd3DynamicEventNameMapProvider,
  axisManager: Hd3AxisManager | null,
}

export interface Hd3AxisManagerEvents {
  addAxis: Hd3Axis,
  removeAxis: Hd3Axis,
  getAxisManager: GetAxisManagerCallback,
  axesListChanged: AxesState,
  axisManagerChanged: Hd3AxisManagerChangedEvent,
}

/**
 * Manager that keeps track of axis renderers added to the chart.
 */
export class Hd3AxisManager {
  public readonly chart: Hd3Chart;
  private xAxes: Map<string, Hd3Axis> = new Map();
  private yAxes: Map<string, Hd3Axis> = new Map();
  public readonly e: Hd3EventNameMap<Hd3AxisManagerEvents>;

  constructor(chart: Hd3Chart) {
    this.chart = chart;
    this.handleAddAxis = this.handleAddAxis.bind(this);
    this.handleRemoveAxis = this.handleRemoveAxis.bind(this);
    this.handleGetAxisManager = this.handleGetAxisManager.bind(this)
    this.handleAxisDestroyed = this.handleAxisDestroyed.bind(this)
    const bus = this.chart.bus;

    this.e = {
      addAxis:             chart.e<Hd3AxisManagerEvents>()('addAxis'),
      removeAxis:          chart.e<Hd3AxisManagerEvents>()('removeAxis'),
      getAxisManager:       chart.e<Hd3AxisManagerEvents>()('getAxisManager'),
      axesListChanged:      chart.e<Hd3AxisManagerEvents>()('axesListChanged'),
      axisManagerChanged:   chart.e<Hd3AxisManagerEvents>()('axisManagerChanged'),
    }


    bus.on(this.e.addAxis, this.handleAddAxis);
    bus.on(this.e.removeAxis, this.handleRemoveAxis);
    bus.on(this.e.getAxisManager, this.handleGetAxisManager);
    bus.on(chart.e.destroyed, this.destroy.bind(this));

    // Announce manager on the bus
    bus.emit(chart.e<Hd3AxisManagerEvents>()('axisManagerChanged'), {provider: chart, axisManager: this});
  }

  private handleAddAxis(axis: unknown): void {
    if (axis instanceof Hd3Axis) {
      if(axis.component === 'x') {
        this.xAxes.set(axis.name, axis);
      }
      else {
        this.yAxes.set(axis.name, axis);
      }
      this.chart.bus.on(axis.e.destroyed, this.handleAxisDestroyed);
      this.notifyAxesChanged();
    }
  }

  private handleRemoveAxis(axis: unknown): void {
    if (axis instanceof Hd3Axis) {
      if(axis.component === 'x') {
        this.xAxes.delete(axis.name);
      }
      else {
        this.yAxes.delete(axis.name);
      }
      this.chart.bus.off(axis.e.destroyed, this.handleAxisDestroyed);
      this.notifyAxesChanged();
    }
  }

  private handleAxisDestroyed(axis: Hd3Axis){
    this.chart.bus.emit(this.e.removeAxis, axis);
  }

  private handleGetAxisManager(callback: GetAxisManagerCallback): void {
    callback(this);
  }

  private notifyAxesChanged(): void {
    this.chart.bus.emit(this.chart.e<Hd3AxisManagerEvents>()('axesListChanged'), this.getAxesState());
  }

  public getAxesState(filter?:(Hd3Axis | string)[]): AxesState {
    const filterSet = new Set(filter);
    if(filter === undefined) {
      return {
        x: [...this.xAxes.values()],
        y: [...this.yAxes.values()]
      };
    }
    else {
      return {
        x: [...this.xAxes.values()].filter((e) => (filterSet.has(e) || filterSet.has(e.name))),
        y: [...this.yAxes.values()].filter((e) => (filterSet.has(e) || filterSet.has(e.name))),
      };
      
    }
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
    this.chart.bus.off(this.e.getAxisManager, this.handleGetAxisManager);
    this.chart.bus.off(this.e.removeAxis, this.handleRemoveAxis);
    this.chart.bus.off(this.e.addAxis, this.handleAddAxis);
    this.chart.bus.emit(this.chart.e<Hd3AxisManagerEvents>()('axisManagerChanged'), undefined);
    (this as any).chart = undefined;
    (this as any).xAxes = undefined;
    (this as any).yAxes = undefined;
  }
}
