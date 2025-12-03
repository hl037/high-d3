import * as d3 from 'd3';

import type { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../../managers/Hd3AxisManager';
import { Hd3InteractionArea, Hd3InteractionAreaManagerEvents, Hd3InteractionAreaChartEvents, DragEventData, MouseEventData } from '../Hd3InteractionArea';
import { invertScale } from '../../axis/invertScale';

export interface Hd3PanToolOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
}

export interface Hd3PanToolEvents {
  destroyed: Hd3PanTool;
}

interface ChartData {
  interactionArea?: Hd3InteractionArea;
  initialDomains: Map<string, d3.AxisDomain[]> | null;
  initialScales: Map<string, d3.AxisScale<d3.AxisDomain>> | null;
  startX: number | null;
  startY: number | null;
  handleMouseDown: (data: MouseEventData) => void;
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
    if (this.chartData.has(chart)) {return;}

    const chartData: ChartData = {
      initialDomains: null,
      initialScales: null,
      startX: null,
      startY: null,
      handleMouseDown: (data: MouseEventData) => this.handleMouseDown(chart, data),
      handleDrag: (data: DragEventData) => this.handleDrag(chart, data),
      handleDragEnd: () => this.handleDragEnd(chart),
      handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => {
        if (chartData.interactionArea !== undefined) {
          this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('mousedown'), chartData.handleMouseDown);
          this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('drag'), chartData.handleDrag);
          this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('dragend'), chartData.handleDragEnd);
        }
        chartData.interactionArea = interactionArea;
        if (chartData.interactionArea !== undefined) {
          this.bus.on(chart.e<Hd3InteractionAreaChartEvents>()('mousedown'), chartData.handleMouseDown);
          this.bus.on(chart.e<Hd3InteractionAreaChartEvents>()('drag'), chartData.handleDrag);
          this.bus.on(chart.e<Hd3InteractionAreaChartEvents>()('dragend'), chartData.handleDragEnd);
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
    if (!chartData) {return;}

    this.bus.off(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), chartData.handleInteractionAreaChanged);
    this.bus.off(chart.e.destroyed, this.removeFromChart);

    if (chartData.interactionArea) {
      this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('mousedown'), chartData.handleMouseDown);
      this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('drag'), chartData.handleDrag);
      this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('dragend'), chartData.handleDragEnd);
    }

    this.chartData.delete(chart);
  }

  private handleMouseDown(chart: Hd3Chart, mouseData: MouseEventData): void {
    const chartData = this.chartData.get(chart);
    if (!chartData) {return;}

    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    chartData.initialDomains = new Map();
    chartData.initialScales = new Map();
    chartData.startX = mouseData.x;
    chartData.startY = mouseData.y;

    for (const axis of allAxes) {
      const domain = axis.axisDomain.domain;
      chartData.initialDomains.set(axis.name, [...domain]);
      
      const scale = axis.getScale(chart);
      if (scale) {
        chartData.initialScales.set(axis.name, scale.copy());
      }
    }
  }

  private handleDrag(chart: Hd3Chart, dragData: DragEventData): void {
    const chartData = this.chartData.get(chart);
    if (!chartData || !chartData.initialDomains || !chartData.initialScales) {return;}
    if (chartData.startX === null || chartData.startY === null) {return;}

    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    for (const axis of allAxes) {
      const initialDomain = chartData.initialDomains.get(axis.name);
      const initialScale = chartData.initialScales.get(axis.name);
      
      if (!initialDomain || !initialScale) {continue;}
      
      const currentPixel = axis.component === 'x' ? dragData.x : dragData.y;
      const startPixel = axis.component === 'x' ? chartData.startX : chartData.startY;
      const deltaPixel = startPixel - currentPixel;

      const initialPixel0 = initialScale(initialDomain[0]);
      const initialPixel1 = initialScale(initialDomain[1]);

      const newPixel0 = (initialPixel0 as number) + deltaPixel;
      const newPixel1 = (initialPixel1 as number) + deltaPixel;

      const newDomain0 = invertScale(initialScale, newPixel0);
      const newDomain1 = invertScale(initialScale, newPixel1);

      if (typeof newDomain0 !== 'number' || typeof newDomain1 !== 'number') {continue;}

      axis.axisDomain.domain = [newDomain0, newDomain1];
    }
  }

  private handleDragEnd(chart: Hd3Chart): void {
    const chartData = this.chartData.get(chart);
    if (chartData) {
      chartData.initialDomains = null;
      chartData.initialScales = null;
      chartData.startX = null;
      chartData.startY = null;
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
