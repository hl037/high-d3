import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from './Hd3Series';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3XAxisRenderer } from '../axis/Hd3XAxisRenderer';
import type { Hd3YAxisRenderer } from '../axis/Hd3YAxisRenderer';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import type { AxisRenderersState, GetAxisRenderersCallback } from '../managers/managerInterfaces';

export interface Hd3SeriesRendererStyle {
  color?: string;
}

export interface Hd3SeriesRendererOptions {
  series: Hd3Series;
  xAxisRenderer?: Hd3XAxisRenderer | string;
  yAxisRenderer?: Hd3YAxisRenderer | string;
  style?: Hd3SeriesRendererStyle;
}

/**
 * Base class for series visual representations.
 * Can accept axis renderers directly, by name, or undefined (will use first available).
 */
export abstract class Hd3SeriesRenderer implements RenderableI, GetAxisRenderersCallback {
  protected series: Hd3Series;
  protected xAxisRenderer?: Hd3XAxisRenderer;
  protected yAxisRenderer?: Hd3YAxisRenderer;
  protected xAxisRendererRef: Hd3XAxisRenderer | string | undefined;
  protected yAxisRendererRef: Hd3YAxisRenderer | string | undefined;
  protected group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected color: string;
  private seriesBusEndpoint?: Hd3BusEndpoint;
  private chartBusEndpoint?: Hd3BusEndpoint;
  private chart?: Hd3Chart;

  constructor(options: Hd3SeriesRendererOptions) {
    this.series = options.series;
    this.xAxisRendererRef = options.xAxisRenderer;
    this.yAxisRendererRef = options.yAxisRenderer;
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
        axisRenderersListChanged: () => this.updateAxisRenderers()
      }
    });
    this.chartBusEndpoint.bus = chart.getBus();

    // Request current axis renderers
    chart.emit('getAxisRenderers', this);
  }

  setAxisRenderers(state: AxisRenderersState): void {
    // Resolve X axis renderer
    if (this.xAxisRendererRef === undefined) {
      // Use first available X axis
      this.xAxisRenderer = state.x[0];
    } else if (typeof this.xAxisRendererRef === 'string') {
      // Find by name
      this.xAxisRenderer = state.x.find(axis => axis.name === this.xAxisRendererRef);
    } else {
      // Direct object reference
      this.xAxisRenderer = this.xAxisRendererRef;
    }

    // Resolve Y axis renderer
    if (this.yAxisRendererRef === undefined) {
      // Use first available Y axis
      this.yAxisRenderer = state.y[0];
    } else if (typeof this.yAxisRendererRef === 'string') {
      // Find by name
      this.yAxisRenderer = state.y.find(axis => axis.name === this.yAxisRendererRef);
    } else {
      // Direct object reference
      this.yAxisRenderer = this.yAxisRendererRef;
    }

    this.renderData();
  }

  private updateAxisRenderers(): void {
    if (this.chart) {
      this.chart.emit('getAxisRenderers', this);
    }
  }

  protected abstract renderData(): void;

  protected setVisible(visible: boolean): void {
    if (this.group) {
      this.group.style('display', visible ? null : 'none');
    }
  }

  protected getX(d: [unknown, number]): number {
    if (!this.xAxisRenderer) return 0;
    const scale = this.xAxisRenderer.scale as d3.ScaleLinear<number, number>;
    return scale(d[0] as number);
  }

  protected getY(d: [unknown, number]): number {
    if (!this.yAxisRenderer) return 0;
    const scale = this.yAxisRenderer.scale as d3.ScaleLinear<number, number>;
    return scale(d[1]);
  }

  destroy(): void {
    this.seriesBusEndpoint?.destroy();
    this.chartBusEndpoint?.destroy();
    if (this.group) {
      this.group.remove();
    }
  }
}
