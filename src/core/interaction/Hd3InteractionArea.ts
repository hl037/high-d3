import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';
import type { RenderableI } from '../interfaces/RenderableI';

export interface MouseEventData {
  x: number;
  y: number;
  event: MouseEvent;
}

/**
 * Interaction area that captures mouse events and emits them on a dedicated bus.
 */
export class Hd3InteractionArea implements RenderableI {
  private bus: Hd3Bus;
  private rect?: d3.Selection<SVGRectElement, unknown, null, undefined>;
  private isDragging: boolean = false;
  private dragStart?: { x: number; y: number };

  constructor() {
    this.bus = createHd3Bus();
  }

  render(chart: Hd3Chart): void {
    const mainGroup = chart.getMainGroup();
    
    if (this.rect) {
      this.rect.remove();
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
      this.isDragging = true;
      this.dragStart = { x, y };
      this.bus.emit('mousedown', { x, y, event });
    });

    this.rect.on('mousemove', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      this.bus.emit('mousemove', { x, y, event });
      
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
      }
    });

    this.rect.on('mouseup', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      this.bus.emit('mouseup', { x, y, event });
      
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
      }
      
      this.isDragging = false;
      this.dragStart = undefined;
    });

    this.rect.on('mouseleave', (event: MouseEvent) => {
      const [x, y] = d3.pointer(event);
      this.bus.emit('mouseleave', { x, y, event });
      this.isDragging = false;
      this.dragStart = undefined;
    });

    this.rect.on('wheel', (event: WheelEvent) => {
      event.preventDefault();
      const [x, y] = d3.pointer(event);
      this.bus.emit('wheel', { x, y, delta: event.deltaY, event });
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
  }
}
