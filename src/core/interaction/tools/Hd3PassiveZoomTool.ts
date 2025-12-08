/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../../managers/Hd3AxisManager';
import { invertScale } from '../../axis/invertScale';

export interface Hd3PassiveZoomToolOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
  zoomFactor?: number;
}

export interface Hd3PassiveZoomToolEvents {
  destroyed: Hd3PassiveZoomTool;
}

export class Hd3PassiveZoomTool {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3PassiveZoomToolEvents>;
  public readonly name = 'zoom';
  private chartData: Set<Hd3Chart>;
  private axes?: (Hd3Axis | string)[];
  private zoomFactor: number;

  constructor(options: Hd3PassiveZoomToolOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Set();
    this.axes = options.axes;
    this.zoomFactor = options.zoomFactor ?? 0.8;

    this.e = {
      destroyed: createHd3Event<Hd3PassiveZoomTool>('clickZoomTool.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) {return;}

    this.chartData.add(chart);

    this.bus.on(chart.e.destroyed, this.removeFromChart);
  }

  public removeFromChart(chart: Hd3Chart) {
    if (!this.chartData.has(chart)) {return;}

    this.bus.off(chart.e.destroyed, this.removeFromChart);

    this.chartData.delete(chart);
  }
  
  public centeredZoom(chart: Hd3Chart, factor: number): void {
    this.zoom(
      chart,
      chart.innerWidth / 2,
      chart.innerHeight / 2,
      factor
    )
  }

  public zoom(chart: Hd3Chart, mouseX: number, mouseY: number, factor: number): void {
    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    for (const axis of allAxes) {
      const scale = axis.getScale(chart);
      if (!scale || typeof (scale as any).invert !== 'function') {continue;}

      const range = scale.range() as [number, number];
      const rangeMin = Math.min(range[0], range[1]);
      const rangeMax = Math.max(range[0], range[1]);

      const point = axis.component === 'x' ? mouseX : mouseY;

      const distanceToMin = point - rangeMin;
      const distanceToMax = rangeMax - point;

      const newDistanceToMin = distanceToMin / factor;
      const newDistanceToMax = distanceToMax / factor;

      const newMin = point - newDistanceToMin;
      const newMax = point + newDistanceToMax;

      const newDomainMin = invertScale(scale, newMin);
      const newDomainMax = invertScale(scale, newMax);

      if (typeof newDomainMin !== 'number' || typeof newDomainMax !== 'number') {continue;}

      const domain = [...axis.axisDomain.domain];
      const isReversed = (domain[0] as number) > (domain[1] as number);

      axis.axisDomain.domain = isReversed 
        ? [newDomainMax, newDomainMin]
        : [newDomainMin, newDomainMax];
    }
  }
  
  public zoomAll(factor: number): void {
    const axesZoomed = new Set();
    for(const chart of this.chartData){
      const mouseX = chart.innerWidth / 2;
      const mouseY = chart.innerHeight / 2;
      const axes = this.getAxes(chart);
      const allAxes = [...(axes.x || []), ...(axes.y || [])];

      for (const axis of allAxes) {
        if(axesZoomed.has(axis)) {
          continue;
        }
        axesZoomed.add(axis);
        const scale = axis.getScale(chart);
        if (!scale || typeof (scale as any).invert !== 'function') {continue;}

        const range = scale.range() as [number, number];
        const rangeMin = Math.min(range[0], range[1]);
        const rangeMax = Math.max(range[0], range[1]);

        const point = axis.component === 'x' ? mouseX : mouseY;

        const distanceToMin = point - rangeMin;
        const distanceToMax = rangeMax - point;

        const newDistanceToMin = distanceToMin / factor;
        const newDistanceToMax = distanceToMax / factor;

        const newMin = point - newDistanceToMin;
        const newMax = point + newDistanceToMax;

        const newDomainMin = invertScale(scale, newMin);
        const newDomainMax = invertScale(scale, newMax);

        if (typeof newDomainMin !== 'number' || typeof newDomainMax !== 'number') {continue;}

        const domain = [...axis.axisDomain.domain];
        const isReversed = (domain[0] as number) > (domain[1] as number);

        axis.axisDomain.domain = isReversed 
          ? [newDomainMax, newDomainMin]
          : [newDomainMin, newDomainMax];
      }
    }
  }

  public zoomInAll(){
    this.zoomAll(1/this.zoomFactor);
  }
  
  public zoomOutAll(){
    this.zoomAll(this.zoomFactor);
  }

  private getAxes(chart: Hd3Chart): { x?: Hd3Axis[]; y?: Hd3Axis[] } {
    const res: { x?: Hd3Axis[]; y?: Hd3Axis[] } = {};
    this.bus.emit(chart.e<Hd3AxisManagerEvents>()('getAxisManager'), (manager: Hd3AxisManager) => {
      const state = manager.getAxesState(this.axes);
      res.x = state.x;
      res.y = state.y;
    });
    return res;
  }

  destroy(): void {
    for (const chart of [...this.chartData]) {
      this.removeFromChart(chart);
    }
    this.bus.emit(this.e.destroyed, this);
  }
}
