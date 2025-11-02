import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3Axis } from '../axis/Hd3Axis';
import type { Hd3AxisDomain } from '../axis/Hd3AxisDomain';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';

export interface MouseEventData {
  x: number;
  y: number;
  event: MouseEvent;
}

export interface DomainEventData {
  value: number | Date | string;
  viewportX: number;
  viewportY: number;
  axisDomain: Hd3AxisDomain;
  event: MouseEvent;
}

export interface Hd3InteractionAreaOptions {
  axes?: (Hd3Axis | string)[];
  buses?: Hd3Bus[];
}

export class Hd3InteractionArea implements RenderableI {
  private bus: Hd3Bus;
  private rect?: d3.Selection<SVGRectElement, unknown, null, undefined>;
  private isDragging: boolean = false;
  private dragStart?: { x: number; y: number };
  private axesDiscovery?: Hd3AxesDiscovery;
  private chart?: Hd3Chart;

  constructor(options: Hd3InteractionAreaOptions = {}) {
    this.bus = createHd3Bus();
    
    if (options.axes || options.buses) {
      this.axesDiscovery = new Hd3AxesDiscovery(
        options.axes || [],
        options.buses || []
      );
    }
  }

  render(chart: Hd3Chart): void {
    this.chart = chart;
    const mainGroup = chart.getMainGroup();
    
    if (this.rect) {
      this.rect.remove();
    }

    this.rect = mainGroup.append('rect')
      .attr('class', 'interaction-area')
      .attr('width', chart.innerWidth)
      .attr('height', chart.innerHeight)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all');

    this.rect.on('mousedown', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      this.isDragging = true;
      this.dragStart = { x, y };
      this.bus.emit('mousedown', { x, y, event });
      this.emitDomainEvents('mousedown', x, y, event);
    });

    this.rect.on('mousemove', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      this.bus.emit('mousemove', { x, y, event });
      this.emitDomainEvents('mousemove', x, y, event);
      
      if (this.isDragging && this.dragStart) {
        this.bus.emit('drag', {
          x,
          y,
          dx: x - this.dragStart.x,
          dy: y - this.dragStart.y,
          startX: this.dragStart.x,
          startY: this.dragStart.y,
          event
        });
        this.emitDomainEvents('drag', x, y, event, {
          startX: this.dragStart.x,
          startY: this.dragStart.y
        });
      }
    });

    this.rect.on('mouseup', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      this.bus.emit('mouseup', { x, y, event });
      this.emitDomainEvents('mouseup', x, y, event);
      
      if (this.isDragging && this.dragStart) {
        this.bus.emit('dragend', {
          x,
          y,
          dx: x - this.dragStart.x,
          dy: y - this.dragStart.y,
          startX: this.dragStart.x,
          startY: this.dragStart.y,
          event
        });
        this.emitDomainEvents('dragend', x, y, event, {
          startX: this.dragStart.x,
          startY: this.dragStart.y
        });
      }
      
      this.isDragging = false;
      this.dragStart = undefined;
    });

    this.rect.on('mouseleave', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      this.bus.emit('mouseleave', { x, y, event });
      this.emitDomainEvents('mouseleave', x, y, event);
      this.isDragging = false;
      this.dragStart = undefined;
    });

    this.rect.on('wheel', (event: WheelEvent) => {
      event.preventDefault();
      const [x, y] = d3.pointer(event);
      this.bus.emit('wheel', { x, y, delta: event.deltaY, event });
      this.emitDomainEvents('wheel', x, y, event, { delta: event.deltaY });
    });

    chart.on('resize', () => {
      if (this.rect) {
        this.rect
          .attr('width', chart.innerWidth)
          .attr('height', chart.innerHeight);
      }
    });
  }

  private emitDomainEvents(
    eventType: string, 
    x: number, 
    y: number, 
    event: MouseEvent | WheelEvent,
    extraData?: Record<string, unknown>
  ): void {
    if (!this.axesDiscovery) {
      return;
    }

    const axes = this.axesDiscovery.getAxes();
    
    for (const axis of axes) {
      const orientation = axis.getOrientation();
      const pixelValue = orientation === 'x' ? x : y;
      
      const scale = axis.scale as { invert?: (value: number) => number | Date };
      if (!scale.invert) {
        continue;
      }
      
      const domainValue = scale.invert(pixelValue);
      const axisDomain = axis.getAxisDomain();
      
      const eventData: DomainEventData & Record<string, unknown> = {
        value: domainValue,
        viewportX: x,
        viewportY: y,
        axisDomain,
        event: event as MouseEvent,
        ...extraData
      };
      
      axisDomain.getBus().emit(eventType, eventData);
    }
  }

  getBus(): Hd3Bus {
    return this.bus;
  }

  on(event: string, handler: (data?: unknown) => void): void {
    this.bus.on(event, handler);
  }

  off(event: string, handler: (data?: unknown) => void): void {
    this.bus.off(event, handler);
  }

  emit(event: string, data?: unknown): void {
    this.bus.emit(event, data);
  }

  destroy(): void {
    if (this.rect) {
      this.rect.remove();
    }
    this.axesDiscovery?.destroy();
  }
}
