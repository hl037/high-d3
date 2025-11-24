import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';
import type { Hd3Axis } from '../axis/Hd3Axis';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';
import { invertScale } from '../axis/invertScale';

export type Hd3MappedCoords = Record<string, number | string | Date | undefined>

export interface MouseEventData {
  x: number;
  y: number;
  event: MouseEvent;
  mappedCoords: Hd3MappedCoords;
}

export interface WheelEventData {
  x: number;
  y: number;
  delta: number;
  event: WheelEvent;
  mappedCoords: Hd3MappedCoords;
}

export interface DragEventData {
  x: number;
  y: number;
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  mappedCoords: Hd3MappedCoords;
  startMappedCoords: Hd3MappedCoords;
  event: MouseEvent;
}

export interface Hd3InteractionAreaChartEvents {
  mousedown: MouseEventData;
  mousemove: MouseEventData;
  mouseup: MouseEventData;
  mouseleave: MouseEventData;
  wheel: WheelEventData;
  drag: DragEventData;
  dragend: DragEventData;
  destroyed: Hd3InteractionArea;
}

export interface Hd3InteractionAreaEvents {
  destroyed: Hd3InteractionArea;
}

interface GetInteractionAreaManagerCallbackI {
  (m: Hd3InteractionArea): void;
}

export interface Hd3InteractionAreaManagerEvents {
  getInteractionArea: GetInteractionAreaManagerCallbackI;
  interactionAreaChanged: Hd3InteractionArea | undefined;
}

export interface Hd3InteractionAreaOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
}

type D3Rect = d3.Selection<SVGRectElement, unknown, null, undefined>;

interface ChartData {
  rect: D3Rect;
  isDragging: boolean;
  dragStart?: { x: number; y: number; mappedCoords?: Hd3MappedCoords };
  handleResize: () => void;
  handleGetManager: (cb: GetInteractionAreaManagerCallbackI) => void;
}

/**
 * Interaction area that captures mouse events and emits them on the bus.
 */
export class Hd3InteractionArea {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3InteractionAreaEvents>;
  private chartData: Map<Hd3Chart, ChartData>;
  private axes?: (Hd3Axis | string)[];

  constructor(options: Hd3InteractionAreaOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.axes = options.axes;

    this.e = {
      destroyed: createHd3Event<Hd3InteractionArea>('interaction-area.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;
    if(chart.bus !== this.bus) {
      throw new Error('Chart and area on different buses')
    }

    const handleResize = () => {
      console.log('TTT IA handling', {ev: chart.e.resized})
      const data = this.chartData.get(chart);
      if (data?.rect) {
        data.rect
          .attr('width', chart.innerWidth)
          .attr('height', chart.innerHeight);
      }
    };

    const handleGetManager = (cb: GetInteractionAreaManagerCallbackI) => {
      cb(this);
    };

    const rect = chart.layer.interaction.append('rect')
      .attr('class', 'interaction-area')
      .attr('width', chart.innerWidth)
      .attr('height', chart.innerHeight)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all');

    const chartData: ChartData = {
      rect,
      isDragging: false,
      handleResize,
      handleGetManager,
    };

    this.chartData.set(chart, chartData);
    this.setupEvents(chart, chartData);

    console.log('TTT IA', {ev: chart.e.resized})

    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.on(chart.e.resized, handleResize);
    this.bus.on(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), chartData.handleGetManager);
    this.bus.emit(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), this);
  }

  public removeFromChart(chart: Hd3Chart) {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    this.bus.emit(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), undefined);
    this.bus.off(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), chartData.handleGetManager);

    chartData.rect.remove();
    this.bus.off(chart.e.destroyed, this.removeFromChart);
    console.log('TTT IA off', {ev: chart.e.resized})
    this.bus.off(chart.e.resized, chartData.handleResize);
    this.chartData.delete(chart);
  }

  private setupEvents(chart: Hd3Chart, chartData: ChartData) {
    const { rect } = chartData;

    rect.on('mousedown', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(chart, x, y);
      chartData.isDragging = true;
      chartData.dragStart = {
        x,
        y,
        mappedCoords,
      };
      this.bus.emit(chart.e<Hd3InteractionAreaChartEvents>()('mousedown'), { x, y, event, mappedCoords });
    });

    rect.on('mousemove', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(chart, x, y);
      this.bus.emit(chart.e<Hd3InteractionAreaChartEvents>()('mousemove'), { x, y, event, mappedCoords });

      if (chartData.isDragging && chartData.dragStart) {
        this.bus.emit(chart.e<Hd3InteractionAreaChartEvents>()('drag'), {
          x, y,
          dx: x - chartData.dragStart.x,
          dy: y - chartData.dragStart.y,
          startX: chartData.dragStart.x,
          startY: chartData.dragStart.y,
          mappedCoords,
          startMappedCoords: chartData.dragStart.mappedCoords,
          event,
        });
      }
    });

    rect.on('mouseup', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(chart, x, y);
      this.bus.emit(chart.e<Hd3InteractionAreaChartEvents>()('mouseup'), { x, y, event, mappedCoords });

      if (chartData.isDragging && chartData.dragStart) {
        this.bus.emit(chart.e<Hd3InteractionAreaChartEvents>()('dragend'), {
          x, y,
          dx: x - chartData.dragStart.x,
          dy: y - chartData.dragStart.y,
          startX: chartData.dragStart.x,
          startY: chartData.dragStart.y,
          mappedCoords,
          startMappedCoords: chartData.dragStart.mappedCoords,
          event,
        });
      }

      chartData.isDragging = false;
      chartData.dragStart = undefined;
    });

    rect.on('mouseleave', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(chart, x, y);
      this.bus.emit(chart.e<Hd3InteractionAreaChartEvents>()('mouseleave'), { x, y, event, mappedCoords });
      chartData.isDragging = false;
      chartData.dragStart = undefined;
    });

    rect.on('wheel', (event: WheelEvent) => {
      event.preventDefault();
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(chart, x, y);
      this.bus.emit(chart.e<Hd3InteractionAreaChartEvents>()('wheel'), { x, y, delta: event.deltaY, event, mappedCoords });
    });
  }
  
  private getMappedCoordinates(chart: Hd3Chart, x: number, y: number): Hd3MappedCoords {
    const mapped: Hd3MappedCoords = {};

    this.bus.emit(chart.e<Hd3AxisManagerEvents>()('getAxisManager'), (manager: Hd3AxisManager) => {
      const state = manager.getAxesState(this.axes);

      for (const axis of state.x) {
        if (axis?.name) {
          const scale = axis.getScale(chart);
          const value = invertScale(scale, x);
          mapped[axis.name] = value;
        }
      }

      for (const axis of state.y) {
        if (axis?.name) {
          const scale = axis.getScale(chart);
          const value = invertScale(scale, y);
          mapped[axis.name] = value;
        }
      }
    });

    return mapped;
  }

  destroy() {
    for (const chart of this.chartData.keys()) {
      this.removeFromChart(chart);
    }
    this.bus.emit(this.e.destroyed, this);
  }
}
