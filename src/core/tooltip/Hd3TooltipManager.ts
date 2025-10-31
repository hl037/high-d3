import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3InteractionArea } from '../interaction/Hd3InteractionArea';
import type { Hd3Series } from '../series/Hd3Series';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';

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

/**
 * Tooltip manager that emits show/hide events with series data.
 * Connects to interaction area and series to provide tooltip information.
 */
export class Hd3TooltipManager {
  private chart: Hd3Chart;
  private interactionArea: Hd3InteractionArea;
  private series: Hd3Series[];
  private xAxis: Hd3XAxis;
  private yAxis: Hd3YAxis;
  private bus: Hd3Bus;

  constructor(
    chart: Hd3Chart,
    interactionArea: Hd3InteractionArea,
    series: Hd3Series[],
    xAxis: Hd3XAxis,
    yAxis: Hd3YAxis
  ) {
    this.chart = chart;
    this.interactionArea = interactionArea;
    this.series = series;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.bus = createHd3Bus();

    this.interactionArea.on('mousemove', this.handleMouseMove.bind(this));
    this.interactionArea.on('mouseleave', this.handleMouseLeave.bind(this));
  }

  private handleMouseMove(data: unknown): void {
    const mouseData = data as { x: number; y: number };
    
    // Convert pixel to data coordinates
    const xScale = this.xAxis.scale as { invert: (x: number) => number };
    const yScale = this.yAxis.scale as { invert: (y: number) => number };
    
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
}
