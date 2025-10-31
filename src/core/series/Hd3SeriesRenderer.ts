import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from './Hd3Series';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';

export interface Hd3SeriesRendererStyle {
  color?: string;
}

export interface Hd3SeriesRendererOptions {
  series: Hd3Series;
  xAxis?: Hd3XAxis;
  yAxis?: Hd3YAxis;
  style?: Hd3SeriesRendererStyle;
}

/**
 * Base class for series visual representations.
 */
export abstract class Hd3SeriesRenderer implements RenderableI {
  protected series: Hd3Series;
  protected xAxis?: Hd3XAxis;
  protected yAxis?: Hd3YAxis;
  protected group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected color: string;
  private seriesBusEndpoint?: Hd3BusEndpoint;
  private xAxisBusEndpoint?: Hd3BusEndpoint;
  private yAxisBusEndpoint?: Hd3BusEndpoint;

  constructor(options: Hd3SeriesRendererOptions) {
    this.series = options.series;
    this.xAxis = options.xAxis;
    this.yAxis = options.yAxis;
    this.color = options.style?.color || this.getDefaultColor();
  }

  private getDefaultColor(): string {
    const colors = d3.schemeCategory10;
    const hash = this.series.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  render(chart: Hd3Chart): void {
    const mainGroup = chart.getMainGroup();
    
    if (this.group) {
      this.group.remove();
    }

    this.group = mainGroup.append('g')
      .attr('class', `series series-${this.series.name}`);

    this.renderData();

    // Connect to series bus
    this.seriesBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        dataChanged: () => this.renderData(),
        visibilityChanged: (visible: unknown) => this.setVisible(visible as boolean)
      }
    });
    this.seriesBusEndpoint.bus = this.series.getBus();

    // Connect to X axis bus
    if (this.xAxis) {
      this.xAxisBusEndpoint = new Hd3BusEndpoint({
        listeners: {
          domainChanged: () => this.renderData(),
          rangeChanged: () => this.renderData()
        }
      });
      this.xAxisBusEndpoint.bus = this.xAxis.getBus();
    }

    // Connect to Y axis bus
    if (this.yAxis) {
      this.yAxisBusEndpoint = new Hd3BusEndpoint({
        listeners: {
          domainChanged: () => this.renderData(),
          rangeChanged: () => this.renderData()
        }
      });
      this.yAxisBusEndpoint.bus = this.yAxis.getBus();
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
    this.xAxisBusEndpoint?.destroy();
    this.yAxisBusEndpoint?.destroy();
    if (this.group) {
      this.group.remove();
    }
  }
}
