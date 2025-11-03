import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3Bus } from '../bus/Hd3Bus';
import type { Hd3Axis } from '../axis/Hd3Axis';
import type { RenderableI } from '../interfaces/RenderableI';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';

export interface MouseEventData {
  x: number;
  y: number;
  event: MouseEvent;
  mappedCoords?: Record<string, number>;
}

export interface Hd3InteractionAreaOptions {
  axes?: (Hd3Axis | string)[];
  charts?: Hd3Bus[];
}

/**
 * Interaction area that captures mouse events and emits them on the chart bus.
 */
export class Hd3InteractionArea implements RenderableI {
  private rect?: d3.Selection<SVGRectElement, unknown, null, undefined>;
  private isDragging: boolean = false;
  private dragStart?: { x: number; y: number; mappedCoords?: Record<string, number> };
  private chart?: Hd3Chart;
  private axisDiscovery?: Hd3AxesDiscovery;

  constructor(options: Hd3InteractionAreaOptions = {}) {
    if (options.axes !== undefined || options.charts !== undefined) {
      const charts = options.charts || [];
      this.axisDiscovery = new Hd3AxesDiscovery(options.axes, charts);
    }
  }

  render(chart: Hd3Chart): void {
    this.chart = chart;
    const mainGroup = chart.getMainGroup();
    
    if (this.rect) {
      this.rect.remove();
    }

    // Add chart to discovery if not already there
    if (this.axisDiscovery && !this.axisDiscovery['buses'].includes(chart.getBus())) {
      this.axisDiscovery['buses'].push(chart.getBus());
      const endpoint = new Hd3BusEndpoint({
        listeners: {
          getAxes: (callback: unknown) => {
            this.axisDiscovery!['setAxisManager'](callback);
          },
          axisManagerChanged: (manager: unknown) => {
            this.axisDiscovery!['handleAxisManagerChanged'](manager);
          }
        }
      });
      endpoint.bus = chart.getBus();
      this.axisDiscovery['busEndpoints'].push(endpoint);
      chart.emit('getAxes', this.axisDiscovery);
    }

    // Create transparent interaction rect
    this.rect = mainGroup.append('rect')
      .attr('class', 'interaction-area')
      .attr('width', chart.innerWidth)
      .attr('height', chart.innerHeight)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all');

    // Mouse events
    this.rect.on('mousedown', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(x, y);
      this.isDragging = true;
      this.dragStart = { x, y, mappedCoords };
      chart.emit('mousedown', { x, y, event, mappedCoords });
    });

    this.rect.on('mousemove', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(x, y);
      chart.emit('mousemove', { x, y, event, mappedCoords });
      
      if (this.isDragging && this.dragStart) {
        chart.emit('drag', {
          x,
          y,
          dx: x - this.dragStart.x,
          dy: y - this.dragStart.y,
          startX: this.dragStart.x,
          startY: this.dragStart.y,
          mappedCoords,
          startMappedCoords: this.dragStart.mappedCoords,
          event
        });
      }
    });

    this.rect.on('mouseup', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(x, y);
      chart.emit('mouseup', { x, y, event, mappedCoords });
      
      if (this.isDragging && this.dragStart) {
        chart.emit('dragend', {
          x,
          y,
          dx: x - this.dragStart.x,
          dy: y - this.dragStart.y,
          startX: this.dragStart.x,
          startY: this.dragStart.y,
          mappedCoords,
          startMappedCoords: this.dragStart.mappedCoords,
          event
        });
      }
      
      this.isDragging = false;
      this.dragStart = undefined;
    });

    this.rect.on('mouseleave', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(x, y);
      chart.emit('mouseleave', { x, y, event, mappedCoords });
      this.isDragging = false;
      this.dragStart = undefined;
    });

    this.rect.on('wheel', (event: WheelEvent) => {
      event.preventDefault();
      const [x, y] = d3.pointer(event);
      const mappedCoords = this.getMappedCoordinates(x, y);
      chart.emit('wheel', { x, y, delta: event.deltaY, event, mappedCoords });
    });

    // Listen to resize
    chart.on('resize', () => {
      if (this.rect) {
        this.rect
          .attr('width', chart.innerWidth)
          .attr('height', chart.innerHeight);
      }
    });
  }

  private getMappedCoordinates(x: number, y: number): Record<string, number> {
    const mapped: Record<string, number> = {};
    
    if (!this.axisDiscovery) return mapped;
    
    const axes = this.axisDiscovery.getAxes();
    for (const axis of axes) {
      if (axis && 'scale' in axis && 'name' in axis) {
        const scale = (axis as any).scale;
        if (scale && scale.invert) {
          const axisName = (axis as any).name;
          // Determine if this is an X or Y axis by checking constructor name
          const isXAxis = (axis as any).constructor.name === 'Hd3XAxis';
          const value = isXAxis ? x : y;
          mapped[axisName] = scale.invert(value);
        }
      }
    }
    
    return mapped;
  }

  destroy(): void {
    this.axisDiscovery?.destroy();
    if (this.rect) {
      this.rect.remove();
    }
  }
}
