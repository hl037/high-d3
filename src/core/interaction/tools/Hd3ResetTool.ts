import type { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../../managers/Hd3AxisManager';

export interface Hd3ResetToolOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
}

export interface Hd3ResetToolEvents {
  destroyed: Hd3ResetTool;
}

interface ChartData {
  originalDomains: Record<string, Iterable<d3.AxisDomain>>;
}

export class Hd3ResetTool {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3ResetToolEvents>;
  public readonly name = 'reset';
  private chartData: Map<Hd3Chart, ChartData>;
  private axes?: (Hd3Axis | string)[];

  constructor(options: Hd3ResetToolOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.axes = options.axes;

    this.e = {
      destroyed: createHd3Event<Hd3ResetTool>('resetTool.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    const originalDomains:Record<string, Iterable<d3.AxisDomain>> = {};
    for (const axis of allAxes) {
      const domain = axis.axisDomain.domain;
      originalDomains[axis.name] = [...domain];
    }

    const chartData: ChartData = {
      originalDomains
    };

    this.chartData.set(chart, chartData);
    this.bus.on(chart.e.destroyed, this.removeFromChart);
  }

  public removeFromChart(chart: Hd3Chart) {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    this.bus.off(chart.e.destroyed, this.removeFromChart);
    this.chartData.delete(chart);
  }

  public reset(chart?: Hd3Chart): void {
    if (chart) {
      this.resetChart(chart);
    } else {
      for (const c of this.chartData.keys()) {
        this.resetChart(c);
      }
    }
  }

  private resetChart(chart: Hd3Chart): void {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    for (const axis of allAxes) {
      const original = chartData.originalDomains[axis.name];
      if (original) {
        axis.axisDomain.domain = original;
      }
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
