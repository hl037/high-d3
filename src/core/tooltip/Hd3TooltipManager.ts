import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3InteractionArea } from '../interaction/Hd3InteractionArea';
import type { Hd3Series } from '../series/Hd3Series';
import type { Hd3XAxisRenderer } from '../axis/Hd3XAxisRenderer';
import type { Hd3YAxisRenderer } from '../axis/Hd3YAxisRenderer';
import { createHd3Bus, type Hd3Bus } from '../bus/Hd3Bus';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';

export interface TooltipData {
  x: number;
  y: number;
  xSide: 'left' | 'right';
  ySide: 'top' | 'bottom';
  series: Array<{
    name: string;
    value: number;
    dataX: number | string | Date;
    dataY: number;
    color: string;
  }>;
}

export interface Hd3TooltipManagerOptions {
  chart: Hd3Chart;
  interactionArea: Hd3InteractionArea;
  series: Hd3Series[];
  xAxisRenderer: Hd3XAxisRenderer;
  yAxisRenderer: Hd3YAxisRenderer;
}

/**
 * Tooltip manager that emits show/hide events with series data.
 * Connects to interaction area and series to provide tooltip information.
 */
export class Hd3TooltipManager {
  private chart: Hd3Chart;
  private interactionArea: Hd3InteractionArea;
  private series: Hd3Series[];
  private xAxisRenderer: Hd3XAxisRenderer;
  private yAxisRenderer: Hd3YAxisRenderer;
  private bus: Hd3Bus;
  private interactionBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3TooltipManagerOptions) {
    this.chart = options.chart;
    this.interactionArea = options.interactionArea;
    this.series = options.series;
    this.xAxisRenderer = options.xAxisRenderer;
    this.yAxisRenderer = options.yAxisRenderer;
    this.bus = createHd3Bus();

    // Connect to interaction bus
    this.interactionBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        mousemove: (data: unknown) => this.handleMouseMove(data),
        mouseleave: () => this.handleMouseLeave()
      }
    });
    this.interactionBusEndpoint.bus = this.interactionArea.getBus();
  }

  private handleMouseMove(data: unknown): void {
    const mouseData = data as { x: number; y: number };
    
    // Convert pixel to data coordinates
    const xScale = this.xAxisRenderer.scale as { invert: (x: number) => number };
    const yScale = this.yAxisRenderer.scale as { invert: (y: number) => number };
    
    const xValue = xScale.invert(mouseData.x);
    const yValue = yScale.invert(mouseData.y);

    // Find closest points in each series
    const seriesData = this.series
      .filter(s => s.visible)
      .map(series => {
        const data = series.data;
        let closest = data[0];
        let minDist = Infinity;

        for (const point of data) {
          const px = typeof point[0] === 'number' ? point[0] : 0;
          const dist = Math.abs(px - xValue);
          if (dist < minDist) {
            minDist = dist;
            closest = point;
          }
        }

        return {
          name: series.name,
          value: closest[1],
          dataX: closest[0],
          dataY: closest[1],
          color: '#steelblue' // Default color - should be from renderer
        };
      });

    // Determine tooltip position
    const xSide = mouseData.x > this.chart.innerWidth / 2 ? 'left' : 'right';
    const ySide = mouseData.y > this.chart.innerHeight / 2 ? 'top' : 'bottom';

    const tooltipData: TooltipData = {
      x: mouseData.x,
      y: mouseData.y,
      xSide,
      ySide,
      series: seriesData
    };

    this.bus.emit('show', tooltipData);
  }

  private handleMouseLeave(): void {
    this.bus.emit('hide', null);
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

  destroy(): void {
    this.interactionBusEndpoint.destroy();
  }
}
