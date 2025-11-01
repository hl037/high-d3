import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from './Hd3Series';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import type { AxesState, GetAxesCallback } from '../managers/managerInterfaces';

export interface Hd3SeriesRendererStyle {
  color?: string;
}

export interface Hd3SeriesRendererOptions {
  series: Hd3Series;
  xAxis?: Hd3XAxis | string;
  yAxis?: Hd3YAxis | string;
  style?: Hd3SeriesRendererStyle;
}

/**
 * Base class for series visual representations.
 * Can accept axes directly, by name, or undefined (will use first available).
 */
export abstract class Hd3SeriesRenderer implements RenderableI, GetAxesCallback {
  protected series: Hd3Series;
  protected xAxis?: Hd3XAxis;
  protected yAxis?: Hd3YAxis;
  protected xAxisRef: Hd3XAxis | string | undefined;
  protected yAxisRef: Hd3YAxis | string | undefined;
  protected group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected color: string;
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

    // Connect to chart bus to get axis renderers
    this.chartBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        axesListChanged: () => this.updateAxes()
      }
    });
    this.chartBusEndpoint.bus = chart.getBus();

    // Request current axis renderers
    chart.emit('getAxes', this);
  }

  setAxes(state: AxesState): void {
    // Disconnect old axis bus endpoints
    this.xAxisBusEndpoint?.destroy();
    this.yAxisBusEndpoint?.destroy();

    // Resolve X axis renderer
    if (this.xAxisRef === undefined) {
      // Use first available X axis
      this.xAxis = state.x[0];
    } else if (typeof this.xAxisRef === 'string') {
      // Find by name
      this.xAxis = state.x.find(axis => axis.name === this.xAxisRef);
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
      this.yAxis = state.y.find(axis => axis.name === this.yAxisRef);
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

  private updateAxes(): void {
    if (this.chart) {
      this.chart.emit('getAxes', this);
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
    this.seriesBusEndpoint?.destroy();
    this.chartBusEndpoint?.destroy();
    this.xAxisBusEndpoint?.destroy();
    this.yAxisBusEndpoint?.destroy();
    if (this.group) {
      this.group.remove();
    }
  }
}
