import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3Series } from '../series/Hd3Series';
import type { Hd3Axis } from '../axis/Hd3Axis';
import type { Hd3AxisDomain } from '../axis/Hd3AxisDomain';
import type { Hd3Bus } from '../bus/Hd3Bus';
import { createHd3Bus } from '../bus/Hd3Bus';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';
import type { DomainEventData } from '../interaction/Hd3InteractionArea';

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
  series: Hd3Series[];
  axes?: (Hd3Axis | string)[];
  buses?: Hd3Bus[];
}

export class Hd3TooltipManager {
  private chart: Hd3Chart;
  private series: Hd3Series[];
  private axesDiscovery: Hd3AxesDiscovery;
  private bus: Hd3Bus;
  private domainBusEndpoints: Map<Hd3AxisDomain, Hd3BusEndpoint> = new Map();
  private xAxis?: Hd3Axis;
  private yAxis?: Hd3Axis;
  private allXAxes: Hd3Axis[] = [];
  private allYAxes: Hd3Axis[] = [];

  constructor(options: Hd3TooltipManagerOptions) {
    this.chart = options.chart;
    this.series = options.series;
    this.axesDiscovery = new Hd3AxesDiscovery(options.axes || [], options.buses || []);
    this.bus = createHd3Bus();

    this.findXYAxes();
    this.setupAxisListeners();
  }

  private findXYAxes(): void {
    const axes = this.axesDiscovery.getAxes();
    const xAxes = axes.filter(a => a.getOrientation() === 'x');
    const yAxes = axes.filter(a => a.getOrientation() === 'y');
    
    this.xAxis = xAxes[0];
    this.yAxis = yAxes[0];
    this.allXAxes = xAxes;
    this.allYAxes = yAxes;
  }

  private setupAxisListeners(): void {
    // Listen to all X axis domains
    for (const xAxis of this.allXAxes) {
      const axisDomain = xAxis.getAxisDomain();
      const endpoint = new Hd3BusEndpoint({
        listeners: {
          mousemove: (data: unknown) => this.handleMouseMove(data, 'x'),
          mouseleave: () => this.handleMouseLeave()
        }
      });
      endpoint.bus = axisDomain.getBus();
      this.domainBusEndpoints.set(axisDomain, endpoint);
    }
    
    // Listen to all Y axis domains
    for (const yAxis of this.allYAxes) {
      const axisDomain = yAxis.getAxisDomain();
      const endpoint = new Hd3BusEndpoint({
        listeners: {
          mousemove: (data: unknown) => this.handleMouseMove(data, 'y'),
          mouseleave: () => this.handleMouseLeave()
        }
      });
      endpoint.bus = axisDomain.getBus();
      this.domainBusEndpoints.set(axisDomain, endpoint);
    }
  }

  private lastXValue?: number;
  private lastYValue?: number;
  private lastViewportX?: number;
  private lastViewportY?: number;

  private handleMouseMove(data: unknown, source: 'x' | 'y'): void {
    if (!this.xAxis || !this.yAxis) return;
    
    const eventData = data as DomainEventData;
    
    // Update the value for the source axis
    if (source === 'x') {
      this.lastXValue = eventData.value as number;
      this.lastViewportY = eventData.viewportY;
    } else {
      this.lastYValue = eventData.value as number;
      this.lastViewportX = eventData.viewportX;
    }
    
    // We need both X and Y to be set
    if (this.lastXValue === undefined || this.lastYValue === undefined) {
      return;
    }

    // Convert domain values to viewport positions using our own scales
    const xScale = this.xAxis.scale as (x: number) => number;
    const yScale = this.yAxis.scale as (y: number) => number;
    
    const viewportX = xScale(this.lastXValue);
    const viewportY = yScale(this.lastYValue);

    const seriesData = this.series
      .filter(s => s.visible)
      .map(series => {
        const seriesData = series.data;
        let closest = seriesData[0];
        let minDist = Infinity;

        for (const point of seriesData) {
          const px = typeof point[0] === 'number' ? point[0] : 0;
          const dist = Math.abs(px - this.lastXValue!);
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

    const xSide = viewportX > this.chart.innerWidth / 2 ? 'left' : 'right';
    const ySide = viewportY > this.chart.innerHeight / 2 ? 'top' : 'bottom';

    const tooltipData: TooltipData = {
      x: viewportX,
      y: viewportY,
      xSide,
      ySide,
      series: seriesData
    };

    this.bus.emit('show', tooltipData);
  }

  private handleMouseLeave(): void {
    this.lastXValue = undefined;
    this.lastYValue = undefined;
    this.lastViewportX = undefined;
    this.lastViewportY = undefined;
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
    for (const endpoint of this.domainBusEndpoints.values()) {
      endpoint.destroy();
    }
    this.domainBusEndpoints.clear();
    this.axesDiscovery.destroy();
  }
}
