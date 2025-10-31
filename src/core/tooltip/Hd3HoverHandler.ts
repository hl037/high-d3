import type { Hd3InteractionArea } from '../interaction/Hd3InteractionArea';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';

/**
 * Handles hover events and emits data coordinates for X and Y axes.
 * Connected to 2 buses (X and Y) and an interaction area.
 */
export class Hd3HoverHandler {
  private interactionArea: Hd3InteractionArea;
  private xAxis: Hd3XAxis;
  private yAxis: Hd3YAxis;
  private xBus: Hd3Bus;
  private yBus: Hd3Bus;

  constructor(
    interactionArea: Hd3InteractionArea,
    xAxis: Hd3XAxis,
    yAxis: Hd3YAxis,
    xBus: Hd3Bus,
    yBus: Hd3Bus
  ) {
    this.interactionArea = interactionArea;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.xBus = xBus;
    this.yBus = yBus;

    this.interactionArea.on('mousemove', this.handleMouseMove.bind(this));
    this.interactionArea.on('mouseleave', this.handleMouseLeave.bind(this));
  }

  private handleMouseMove(data: unknown): void {
    const mouseData = data as { x: number; y: number };
    
    // Convert pixel coordinates to data coordinates
    const xScale = this.xAxis.scale as { invert: (x: number) => number };
    const yScale = this.yAxis.scale as { invert: (y: number) => number };
    
    const xValue = xScale.invert(mouseData.x);
    const yValue = yScale.invert(mouseData.y);

    this.xBus.emit('hoverX', { pixel: mouseData.x, value: xValue });
    this.yBus.emit('hoverY', { pixel: mouseData.y, value: yValue });
  }

  private handleMouseLeave(): void {
    this.xBus.emit('hoverX', null);
    this.yBus.emit('hoverY', null);
  }
}
