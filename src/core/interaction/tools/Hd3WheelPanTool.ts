import type { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../../managers/Hd3AxisManager';
import { Hd3InteractionArea, Hd3InteractionAreaManagerEvents, Hd3InteractionAreaChartEvents, WheelEventData } from '../Hd3InteractionArea';

export interface Hd3WheelPanToolOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
  panFactor?: number;
}

export interface Hd3WheelPanToolEvents {
  destroyed: Hd3WheelPanTool;
}

interface ChartData {
  interactionArea?: Hd3InteractionArea;
  handleWheel: (data: WheelEventData) => void;
  handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => void;
}

export class Hd3WheelPanTool {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3WheelPanToolEvents>;
  public readonly name = 'wheel-pan';
  private chartData: Map<Hd3Chart, ChartData>;
  private axes?: (Hd3Axis | string)[];
  private panFactor: number;

  constructor(options: Hd3WheelPanToolOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.axes = options.axes;
    this.panFactor = options.panFactor ?? 0.1;

    this.e = {
      destroyed: createHd3Event<Hd3WheelPanTool>('wheelPanTool.destroyed'),
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
    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    for (const axis of allAxes) {
      const scale = axis.getScale(chart);
      if (!scale || typeof (scale as any).invert !== 'function') continue;

      const domain = [...axis.axisDomain.domain];
      if (domain.length !== 2 || typeof domain[0] !== 'number' || typeof domain[1] !== 'number') continue;

      const domainWidth = (domain[1] as number) - (domain[0] as number);
      const delta = (wheelData.delta > 0 ? 1 : -1) * domainWidth * this.panFactor;

      axis.axisDomain.domain = [
        (domain[0] as number) + delta,
        (domain[1] as number) + delta
      ];
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
