import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from './Hd3Series';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import type { Hd3Axis } from '../axis/Hd3Axis';
import type { Hd3Bus } from '../bus/Hd3Bus';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';

export interface Hd3SeriesRendererStyle {
  color?: string;
}

export interface Hd3SeriesRendererOptions {
  series: Hd3Series;
  xAxis?: Hd3XAxis | string;
  yAxis?: Hd3YAxis | string;
  axes?: (Hd3Axis | string)[];
  charts?: Hd3Bus[];
  style?: Hd3SeriesRendererStyle;
}

/**
 * Base class for series visual representations.
 * Can accept axes directly, by name, or undefined (will use first available).
 */
export abstract class Hd3SeriesRenderer implements RenderableI {
  protected series: Hd3Series;
  protected xAxis?: Hd3XAxis;
  protected yAxis?: Hd3YAxis;
  protected xAxisRef: Hd3XAxis | string | undefined;
  protected yAxisRef: Hd3YAxis | string | undefined;
  protected group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected color: string;
  protected axisDiscovery?: Hd3AxesDiscovery;
  private seriesBusEndpoint?: Hd3BusEndpoint;
  private chartBusEndpoint?: Hd3BusEndpoint;
  private xAxisBusEndpoint?: Hd3BusEndpoint;
  private yAxisBusEndpoint?: Hd3BusEndpoint;
  private chart?: Hd3Chart;

  constructor(options: Hd3SeriesRendererOptions) {
    this.series = options.series;
    this.xAxisRef = options.xAxis;
    this.yAxisRef = options.yAxis;
    this.color = options.style?.color || this.getDefaultColor();
    
    // Create axis discovery if axes/charts are provided
    if (options.axes !== undefined || options.charts !== undefined) {
      const charts = options.charts || [];
      this.axisDiscovery = new Hd3AxesDiscovery(options.axes, charts);
    }
  }

  private getDefaultColor(): string {
    const colors = d3.schemeCategory10;
    const hash = this.series.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  render(chart: Hd3Chart): void {
    this.chart = chart;
    const mainGroup = chart.getMainGroup();
    
    if (this.group) {
      this.group.remove();
    }

    this.group = mainGroup.append('g')
      .attr('class', `series series-${this.series.name}`);

    // Connect to series bus
    this.seriesBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        dataChanged: () => this.renderData(),
        visibilityChanged: (visible: unknown) => this.setVisible(visible as boolean)
      }
    });
    this.seriesBusEndpoint.bus = this.series.getBus();

    // If no axisDiscovery, use legacy behavior
    if (!this.axisDiscovery) {
      // Connect to chart bus to get axis renderers
      this.chartBusEndpoint = new Hd3BusEndpoint({
        listeners: {
          axesListChanged: () => this.updateAxesLegacy()
        }
      });
      this.chartBusEndpoint.bus = chart.getBus();

      // Request current axis renderers
      chart.emit('getAxes', { setAxes: (state: any) => this.setAxesLegacy(state) });
    } else {
      // Add chart to discovery if not already there
      if (!this.axisDiscovery['buses'].includes(chart.getBus())) {
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
      
      this.updateAxesFromDiscovery();
    }
  }

  private setAxesLegacy(state: any): void {
    // Disconnect old axis bus endpoints
    this.xAxisBusEndpoint?.destroy();
    this.yAxisBusEndpoint?.destroy();

    // Resolve X axis renderer
    if (this.xAxisRef === undefined) {
      // Use first available X axis
      this.xAxis = state.x[0];
    } else if (typeof this.xAxisRef === 'string') {
      // Find by name
      this.xAxis = state.x.find((axis: any) => axis.name === this.xAxisRef);
    } else {
      // Direct object reference
      this.xAxis = this.xAxisRef;
    }

    // Resolve Y axis renderer
    if (this.yAxisRef === undefined) {
      // Use first available Y axis
      this.yAxis = state.y[0];
    } else if (typeof this.yAxisRef === 'string') {
      // Find by name
      this.yAxis = state.y.find((axis: any) => axis.name === this.yAxisRef);
    } else {
      // Direct object reference
      this.yAxis = this.yAxisRef;
    }

    // Connect to X axis bus (the underlying Hd3Axis)
    if (this.xAxis) {
      const xAxis = (this.xAxis as any).axis;
      if (xAxis && xAxis.getBus) {
        this.xAxisBusEndpoint = new Hd3BusEndpoint({
          listeners: {
            domainChanged: () => this.renderData()
          }
        });
        this.xAxisBusEndpoint.bus = xAxis.getBus();
      }
    }

    // Connect to Y axis bus (the underlying Hd3Axis)
    if (this.yAxis) {
      const yAxis = (this.yAxis as any).axis;
      if (yAxis && yAxis.getBus) {
        this.yAxisBusEndpoint = new Hd3BusEndpoint({
          listeners: {
            domainChanged: () => this.renderData()
          }
        });
        this.yAxisBusEndpoint.bus = yAxis.getBus();
      }
    }

    this.renderData();
  }

  private updateAxesFromDiscovery(): void {
    if (!this.axisDiscovery) return;

    // Disconnect old axis bus endpoints
    this.xAxisBusEndpoint?.destroy();
    this.yAxisBusEndpoint?.destroy();

    const axes = this.axisDiscovery.getAxes();
    
    // Find X and Y axes
    for (const axis of axes) {
      if (axis instanceof Object && 'name' in axis) {
        if (!this.xAxis && (axis as any).constructor.name === 'Hd3XAxis') {
          this.xAxis = axis as Hd3XAxis;
        }
        if (!this.yAxis && (axis as any).constructor.name === 'Hd3YAxis') {
          this.yAxis = axis as Hd3YAxis;
        }
      }
    }

    // Connect to axis buses
    if (this.xAxis) {
      const xAxisDomain = (this.xAxis as any).axis;
      if (xAxisDomain && xAxisDomain.getBus) {
        this.xAxisBusEndpoint = new Hd3BusEndpoint({
          listeners: {
            domainChanged: () => this.renderData()
          }
        });
        this.xAxisBusEndpoint.bus = xAxisDomain.getBus();
      }
    }

    if (this.yAxis) {
      const yAxisDomain = (this.yAxis as any).axis;
      if (yAxisDomain && yAxisDomain.getBus) {
        this.yAxisBusEndpoint = new Hd3BusEndpoint({
          listeners: {
            domainChanged: () => this.renderData()
          }
        });
        this.yAxisBusEndpoint.bus = yAxisDomain.getBus();
      }
    }

    this.renderData();
  }

  private updateAxesLegacy(): void {
    if (this.chart) {
      this.chart.emit('getAxes', { setAxes: (state: any) => this.setAxesLegacy(state) });
    }
  }

  protected abstract renderData(): void;

  protected setVisible(visible: boolean): void {
    if (this.group) {
      this.group.style('display', visible ? null : 'none');
    }
  }

  protected getX(d: [unknown, number]): number {
    if (!this.xAxis) return 0;
    const scale = this.xAxis.scale as d3.ScaleLinear<number, number>;
    return scale(d[0] as number);
  }

  protected getY(d: [unknown, number]): number {
    if (!this.yAxis) return 0;
    const scale = this.yAxis.scale as d3.ScaleLinear<number, number>;
    return scale(d[1]);
  }

  destroy(): void {
    this.axisDiscovery?.destroy();
    this.seriesBusEndpoint?.destroy();
    this.chartBusEndpoint?.destroy();
    this.xAxisBusEndpoint?.destroy();
    this.yAxisBusEndpoint?.destroy();
    if (this.group) {
      this.group.remove();
    }
  }
}
