import type { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../../managers/Hd3AxisManager';
import { Hd3InteractionArea, Hd3InteractionAreaManagerEvents, Hd3InteractionAreaChartEvents, WheelEventData } from '../Hd3InteractionArea';

export interface Hd3WheelZoomToolOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
  zoomFactor?: number;
}

export interface Hd3WheelZoomToolEvents {
  destroyed: Hd3WheelZoomTool;
}

interface ChartData {
  interactionArea?: Hd3InteractionArea;
  handleWheel: (data: WheelEventData) => void;
  handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => void;
}

export class Hd3WheelZoomTool {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3WheelZoomToolEvents>;
  public readonly name = 'wheel-zoom';
  private chartData: Map<Hd3Chart, ChartData>;
  private axes?: (Hd3Axis | string)[];
  private zoomFactor: number;

  constructor(options: Hd3WheelZoomToolOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.axes = options.axes;
    this.zoomFactor = options.zoomFactor ?? 0.1;

    this.e = {
      destroyed: createHd3Event<Hd3WheelZoomTool>('wheelZoomTool.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    const chartData: ChartData = {
      handleWheel: (data: WheelEventData) => this.handleWheel(chart, data),
      handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => {
        if (chartData.interactionArea !== undefined) {
          this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('wheel'), chartData.handleWheel);
        }
        chartData.interactionArea = interactionArea;
        if (chartData.interactionArea !== undefined) {
          this.bus.on(chart.e<Hd3InteractionAreaChartEvents>()('wheel'), chartData.handleWheel);
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
      this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('wheel'), chartData.handleWheel);
    }

    this.chartData.delete(chart);
  }

  private handleWheel(chart: Hd3Chart, wheelData: WheelEventData): void {
    const factor = wheelData.delta > 0 ? 1 - this.zoomFactor : 1 + this.zoomFactor;
    this.zoom(chart, wheelData.x, wheelData.y, factor);
  }

  private zoom(chart: Hd3Chart, mouseX: number, mouseY: number, factor: number): void {
    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    for (const axis of allAxes) {
      const scale = axis.getScale(chart);
      if (!scale || typeof (scale as any).invert !== 'function') continue;

      const range = scale.range() as [number, number];
      const rangeMin = range[0];
      const rangeMax = range[1];

      const point = axis.orientation === 'x' ? mouseX : mouseY;

      const distanceToMin = rangeMin - point;
      const distanceToMax = rangeMax - point;

      const newDistanceToMin = distanceToMin / factor;
      const newDistanceToMax = distanceToMax / factor;

      const newMin = point + newDistanceToMin;
      const newMax = point + newDistanceToMax;

      const newDomainMin = (scale as any).invert(newMin);
      const newDomainMax = (scale as any).invert(newMax);

      if (typeof newDomainMin !== 'number' || typeof newDomainMax !== 'number') continue;

      axis.axisDomain.domain = [newDomainMin, newDomainMax];
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
