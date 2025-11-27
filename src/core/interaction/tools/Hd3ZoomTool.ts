import type { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../../managers/Hd3AxisManager';
import { Hd3InteractionArea, Hd3InteractionAreaManagerEvents, Hd3InteractionAreaChartEvents, MouseEventData } from '../Hd3InteractionArea';

export interface Hd3ZoomToolOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
  zoomFactor?: number;
}

export interface Hd3ZoomToolEvents {
  destroyed: Hd3ZoomTool;
}

interface ChartData {
  interactionArea?: Hd3InteractionArea;
  handleMouseDown: (data: MouseEventData) => void;
  handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => void;
}

export class Hd3ZoomTool {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3ZoomToolEvents>;
  public readonly name = 'zoom';
  private chartData: Map<Hd3Chart, ChartData>;
  private axes?: (Hd3Axis | string)[];
  private zoomFactor: number;

  constructor(options: Hd3ZoomToolOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.axes = options.axes;
    this.zoomFactor = options.zoomFactor ?? 0.8;

    this.e = {
      destroyed: createHd3Event<Hd3ZoomTool>('clickZoomTool.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    const chartData: ChartData = {
      handleMouseDown: (data: MouseEventData) => this.handleMouseDown(chart, data),
      handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => {
        if (chartData.interactionArea !== undefined) {
          this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('mousedown'), chartData.handleMouseDown);
        }
        chartData.interactionArea = interactionArea;
        if (chartData.interactionArea !== undefined) {
          this.bus.on(chart.e<Hd3InteractionAreaChartEvents>()('mousedown'), chartData.handleMouseDown);
        }
      }
    };

    this.chartData.set(chart, chartData);

    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.emit(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), chartData.handleInteractionAreaChanged);
    this.bus.on(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), chartData.handleInteractionAreaChanged);
  }

  public removeFromChart(chart: Hd3Chart) {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    this.bus.off(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), chartData.handleInteractionAreaChanged);
    this.bus.off(chart.e.destroyed, this.removeFromChart);

    if (chartData.interactionArea) {
      this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('mousedown'), chartData.handleMouseDown);
    }

    this.chartData.delete(chart);
  }

  private handleMouseDown(chart: Hd3Chart, mouseData: MouseEventData): void {
    this.zoom(chart, mouseData.x, mouseData.y, this.zoomFactor);
  }

  private zoom(chart: Hd3Chart, mouseX: number, mouseY: number, factor: number): void {
    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    for (const axis of allAxes) {
      const scale = axis.getScale(chart);
      if (!scale || typeof (scale as any).invert !== 'function') continue;

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

      const newDomainMin = (scale as any).invert(newMin);
      const newDomainMax = (scale as any).invert(newMax);

      if (typeof newDomainMin !== 'number' || typeof newDomainMax !== 'number') continue;

      const domain = [...axis.axisDomain.domain];
      const isReversed = (domain[0] as number) > (domain[1] as number);

      axis.axisDomain.domain = isReversed 
        ? [newDomainMax, newDomainMin]
        : [newDomainMin, newDomainMax];
    }
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
    for (const chart of [...this.chartData.keys()]) {
      this.removeFromChart(chart);
    }
    this.bus.emit(this.e.destroyed, this);
  }
}
