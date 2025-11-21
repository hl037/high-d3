import type { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../../managers/Hd3AxisManager';
import { Hd3InteractionArea, Hd3InteractionAreaManagerEvents, DragEventData } from '../Hd3InteractionArea';

export interface Hd3PanToolOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
}

export interface Hd3PanToolEvents {
  destroyed: Hd3PanTool;
}

interface ChartData {
  interactionArea?: Hd3InteractionArea;
  initialDomains: Record<string, Iterable<d3.AxisDomain>> | null;
  handleMouseDown: () => void;
  handleDrag: (data: DragEventData) => void;
  handleDragEnd: () => void;
  handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => void;
}

export class Hd3PanTool {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3PanToolEvents>;
  public readonly name = 'pan';
  private chartData: Map<Hd3Chart, ChartData>;
  private axes?: (Hd3Axis | string)[];

  constructor(options: Hd3PanToolOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.axes = options.axes;

    this.e = {
      destroyed: createHd3Event<Hd3PanTool>('panTool.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    const chartData: ChartData = {
      initialDomains: null,
      handleMouseDown: () => this.handleMouseDown(chart),
      handleDrag: (data: DragEventData) => this.handleDrag(chart, data),
      handleDragEnd: () => this.handleDragEnd(chart),
      handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => {
        if (chartData.interactionArea !== undefined) {
          this.bus.off(chartData.interactionArea.e.mousedown, chartData.handleMouseDown);
          this.bus.off(chartData.interactionArea.e.drag, chartData.handleDrag);
          this.bus.off(chartData.interactionArea.e.dragend, chartData.handleDragEnd);
        }
        chartData.interactionArea = interactionArea;
        if (chartData.interactionArea !== undefined) {
          this.bus.on(interactionArea.e.mousedown, chartData.handleMouseDown);
          this.bus.on(interactionArea.e.drag, chartData.handleDrag);
          this.bus.on(interactionArea.e.dragend, chartData.handleDragEnd);
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
      this.bus.off(chartData.interactionArea.e.mousedown, chartData.handleMouseDown);
      this.bus.off(chartData.interactionArea.e.drag, chartData.handleDrag);
      this.bus.off(chartData.interactionArea.e.dragend, chartData.handleDragEnd);
    }

    this.chartData.delete(chart);
  }

  private handleMouseDown(chart: Hd3Chart): void {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    chartData.initialDomains = {};
    for (const axis of allAxes) {
      const domain = axis.axisDomain.domain;
      chartData.initialDomains[axis.name] = [...domain];
    }
  }

  private handleDrag(chart: Hd3Chart, dragData: DragEventData): void {
    const chartData = this.chartData.get(chart);
    if (!chartData || !chartData.initialDomains) return;

    const { mappedCoords, startMappedCoords } = dragData;

    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    for (const axis of allAxes) {
      const initialDomain = chartData.initialDomains[axis.name];
      if (!initialDomain || !Array.isArray(initialDomain)) continue;

      const currentValue = mappedCoords[axis.name];
      const startValue = startMappedCoords[axis.name];

      if (currentValue === undefined || startValue === undefined) continue;
      if (typeof currentValue !== 'number' || typeof startValue !== 'number') continue;

      const delta = currentValue - startValue;
      axis.axisDomain.domain = [
        (initialDomain[0] as number) - delta,
        (initialDomain[1] as number) - delta
      ];
    }
  }

  private handleDragEnd(chart: Hd3Chart): void {
    const chartData = this.chartData.get(chart);
    if (chartData) {
      chartData.initialDomains = null;
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
