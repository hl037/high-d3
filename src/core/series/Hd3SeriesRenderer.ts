import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from './Hd3Series';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3Axis } from '../axis/Hd3Axis';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';
import type { Hd3Bus } from '../bus/Hd3Bus';

export interface Hd3SeriesRendererStyle {
  color?: string;
}

export interface Hd3SeriesRendererOptions {
  series: Hd3Series;
  xAxis?: Hd3XAxis | string;
  yAxis?: Hd3YAxis | string;
  buses?: Hd3Bus[];
  style?: Hd3SeriesRendererStyle;
}

export abstract class Hd3SeriesRenderer implements RenderableI {
  protected series: Hd3Series;
  protected xAxis?: Hd3XAxis;
  protected yAxis?: Hd3YAxis;
  protected axesDiscovery: Hd3AxesDiscovery;
  protected group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected color: string;
  private seriesBusEndpoint?: Hd3BusEndpoint;
  private xAxisBusEndpoint?: Hd3BusEndpoint;
  private yAxisBusEndpoint?: Hd3BusEndpoint;
  private chart?: Hd3Chart;
  private initialAxes: (Hd3Axis | string)[];
  private initialBuses: Hd3Bus[];

  constructor(options: Hd3SeriesRendererOptions) {
    this.series = options.series;
    this.color = options.style?.color || this.getDefaultColor();
    
    this.initialAxes = [];
    if (options.xAxis) this.initialAxes.push(options.xAxis as Hd3Axis | string);
    if (options.yAxis) this.initialAxes.push(options.yAxis as Hd3Axis | string);
    this.initialBuses = options.buses || [];
    
    this.axesDiscovery = new Hd3AxesDiscovery(
      this.initialAxes.length > 0 ? this.initialAxes : undefined,
      this.initialBuses
    );
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

    this.seriesBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        dataChanged: () => this.renderData(),
        visibilityChanged: (visible: unknown) => this.setVisible(visible as boolean)
      }
    });
    this.seriesBusEndpoint.bus = this.series.getBus();

    // Recreate axes discovery with chart bus included
    const buses = [...this.initialBuses, chart.getBus()];
    
    this.axesDiscovery.destroy();
    this.axesDiscovery = new Hd3AxesDiscovery(
      this.initialAxes.length > 0 ? this.initialAxes : undefined,
      buses
    );

    this.updateAxes();
  }

  private updateAxes(): void {
    this.xAxisBusEndpoint?.destroy();
    this.yAxisBusEndpoint?.destroy();

    const axes = this.axesDiscovery.getAxes();
    
    this.xAxis = axes.find(a => a.getOrientation() === 'x') as Hd3XAxis | undefined;
    this.yAxis = axes.find(a => a.getOrientation() === 'y') as Hd3YAxis | undefined;

    if (this.xAxis) {
      const xAxisDomain = this.xAxis.getAxisDomain();
      this.xAxisBusEndpoint = new Hd3BusEndpoint({
        listeners: {
          domainChanged: () => this.renderData()
        }
      });
      this.xAxisBusEndpoint.bus = xAxisDomain.getBus();
    }

    if (this.yAxis) {
      const yAxisDomain = this.yAxis.getAxisDomain();
      this.yAxisBusEndpoint = new Hd3BusEndpoint({
        listeners: {
          domainChanged: () => this.renderData()
        }
      });
      this.yAxisBusEndpoint.bus = yAxisDomain.getBus();
    }

    this.renderData();
  }

  protected abstract renderData(): void;

  protected setVisible(visible: boolean): void {
    if (this.group) {
      this.group.style('display', visible ? 'block' : 'none');
    }
  }

  destroy(): void {
    this.seriesBusEndpoint?.destroy();
    this.xAxisBusEndpoint?.destroy();
    this.yAxisBusEndpoint?.destroy();
    this.axesDiscovery.destroy();
    if (this.group) {
      this.group.remove();
    }
  }
}
