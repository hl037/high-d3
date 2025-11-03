import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3InteractionArea } from '../interaction/Hd3InteractionArea';
import type { Hd3Series } from '../series/Hd3Series';
import type { Hd3Axis } from '../axis/Hd3Axis';
import type { Hd3Bus } from '../bus/Hd3Bus';
import { createHd3Bus, type Hd3Bus as BusType } from '../bus/Hd3Bus';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';

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
  interactionArea?: Hd3InteractionArea;
  series: Hd3Series[];
  xAxis?: any;
  yAxis?: any;
  axes?: (Hd3Axis | string)[];
  charts?: Hd3Bus[];
}

/**
 * Tooltip manager that emits show/hide events with series data.
 * Connects to interaction area and series to provide tooltip information.
 */
export class Hd3TooltipManager {
  private chart: Hd3Chart;
  private series: Hd3Series[];
  private xAxis?: any;
  private yAxis?: any;
  private axisDiscovery?: Hd3AxesDiscovery;
  private bus: BusType;
  private chartBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3TooltipManagerOptions) {
    this.chart = options.chart;
    this.series = options.series;
    this.xAxis = options.xAxis;
    this.yAxis = options.yAxis;
    this.bus = createHd3Bus();

    // Create axis discovery
    if (options.axes !== undefined || options.charts !== undefined) {
      const charts = options.charts || [this.chart.getBus()];
      this.axisDiscovery = new Hd3AxesDiscovery(options.axes, charts);
      
      // Find X and Y axes from discovery
      const axes = this.axisDiscovery.getAxes();
      for (const axis of axes) {
        if (!this.xAxis && (axis as any).constructor.name === 'Hd3XAxis') {
          this.xAxis = axis;
        }
        if (!this.yAxis && (axis as any).constructor.name === 'Hd3YAxis') {
          this.yAxis = axis;
        }
      }
    }

    // Connect to chart bus for mouse events
    this.chartBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        mousemove: (data: unknown) => this.handleMouseMove(data),
        mouseleave: () => this.handleMouseLeave()
      }
    });
    this.chartBusEndpoint.bus = this.chart.getBus();
  }

  private handleMouseMove(data: unknown): void {
    const mouseData = data as { x: number; y: number; mappedCoords?: Record<string, number> };
    
    let xValue: number | undefined;
    let yValue: number | undefined;

    // Try to use mapped coordinates first
    if (mouseData.mappedCoords && this.xAxis && this.yAxis) {
      const xName = (this.xAxis as any).name;
      const yName = (this.yAxis as any).name;
      xValue = mouseData.mappedCoords[xName];
      yValue = mouseData.mappedCoords[yName];
    }

    // Fallback to scale inversion
    if (xValue === undefined && this.xAxis?.scale?.invert) {
      xValue = this.xAxis.scale.invert(mouseData.x);
    }
    if (yValue === undefined && this.yAxis?.scale?.invert) {
      yValue = this.yAxis.scale.invert(mouseData.y);
    }

    if (xValue === undefined) return;

    // Find closest points in each series
    const seriesData = this.series
      .filter(s => s.visible)
      .map(series => {
        const data = series.data;
        let closest = data[0];
        let minDist = Infinity;

        for (const point of data) {
          const px = typeof point[0] === 'number' ? point[0] : 0;
          const dist = Math.abs(px - xValue!);
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
          color: '#steelblue'
        };
      });

    // Determine tooltip position - center if no y coordinate
    let finalX = mouseData.x;
    let finalY = mouseData.y;
    
    if (yValue === undefined) {
      finalY = this.chart.innerHeight / 2;
    }
    if (xValue === undefined) {
      finalX = this.chart.innerWidth / 2;
    }

    const xSide = finalX > this.chart.innerWidth / 2 ? 'left' : 'right';
    const ySide = finalY > this.chart.innerHeight / 2 ? 'top' : 'bottom';

    const tooltipData: TooltipData = {
      x: finalX,
      y: finalY,
      xSide,
      ySide,
      series: seriesData
    };

    this.bus.emit('show', tooltipData);
  }

  private handleMouseLeave(): void {
    this.bus.emit('hide', null);
  }

  getBus(): BusType {
    return this.bus;
  }

  on(event: string, handler: (data?: unknown) => void): void {
    this.bus.on(event, handler);
  }

  off(event: string, handler: (data?: unknown) => void): void {
    this.bus.off(event, handler);
  }

  destroy(): void {
    this.axisDiscovery?.destroy();
    this.chartBusEndpoint.destroy();
  }
}
