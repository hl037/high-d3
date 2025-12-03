/* eslint-disable @typescript-eslint/no-explicit-any */
import * as d3 from 'd3';

import type { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../../managers/Hd3AxisManager';
import { Hd3InteractionArea, Hd3InteractionAreaManagerEvents, Hd3InteractionAreaChartEvents, MouseEventData, DragEventData } from '../Hd3InteractionArea';

export interface Hd3ZoomToSelectionToolOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
}

export interface Hd3ZoomToSelectionToolEvents {
  destroyed: Hd3ZoomToSelectionTool;
}

type D3Rect = d3.Selection<SVGRectElement, unknown, null, undefined>;

interface ChartData {
  interactionArea?: Hd3InteractionArea;
  selectionRect?: D3Rect;
  handleMouseDown: (data: MouseEventData) => void;
  handleDrag: (data: DragEventData) => void;
  handleDragEnd: (data: DragEventData) => void;
  handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => void;
}

export class Hd3ZoomToSelectionTool {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3ZoomToSelectionToolEvents>;
  public readonly name = 'zoom-selection';
  private chartData: Map<Hd3Chart, ChartData>;
  private axes?: (Hd3Axis | string)[];

  constructor(options: Hd3ZoomToSelectionToolOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.axes = options.axes;

    this.e = {
      destroyed: createHd3Event<Hd3ZoomToSelectionTool>('zoomToSelectionTool.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) {return;}

    const chartData: ChartData = {
      handleMouseDown: (data: MouseEventData) => this.handleMouseDown(chart, data),
      handleDrag: (data: DragEventData) => this.handleDrag(chart, data),
      handleDragEnd: (data: DragEventData) => this.handleDragEnd(chart, data),
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

    chartData.selectionRect?.remove();

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

    if (chartData.selectionRect) {
      chartData.selectionRect.remove();
    }

    chartData.selectionRect = chart.layer.overlay.append('rect')
      .attr('class', 'zoom-selection')
      .attr('x', mouseData.x)
      .attr('y', mouseData.y)
      .attr('width', 0)
      .attr('height', 0)
      .attr('fill', 'rgba(100, 150, 255, 0.3)')
      .attr('stroke', 'rgba(50, 100, 200, 0.8)')
      .attr('stroke-width', 1)
      .style('pointer-events', 'none');
  }

  private handleDrag(chart: Hd3Chart, dragData: DragEventData): void {
    const chartData = this.chartData.get(chart);
    if (!chartData?.selectionRect) {return;}

    const x = Math.min(dragData.startX, dragData.x);
    const y = Math.min(dragData.startY, dragData.y);
    const width = Math.abs(dragData.x - dragData.startX);
    const height = Math.abs(dragData.y - dragData.startY);

    chartData.selectionRect
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height);
  }

  private handleDragEnd(chart: Hd3Chart, dragData: DragEventData): void {
    const chartData = this.chartData.get(chart);
    if (!chartData?.selectionRect) {return;}

    chartData.selectionRect.remove();
    chartData.selectionRect = undefined;

    const { startMappedCoords, mappedCoords } = dragData;

    const axes = this.getAxes(chart);
    const allAxes = [...(axes.x || []), ...(axes.y || [])];

    for (const axis of allAxes) {
      const scale = axis.getScale(chart);
      if (!scale || typeof (scale as any).invert !== 'function') {continue;}

      const start = startMappedCoords[axis.name];
      const end = mappedCoords[axis.name];

      if (start === undefined || end === undefined) {continue;}
      if (typeof start !== 'number' || typeof end !== 'number') {continue;}

      const newDomain: [number, number] = [
        Math.min(start, end),
        Math.max(start, end)
      ];

      axis.axisDomain.domain = newDomain;
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
