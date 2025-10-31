import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from './Hd3Series';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';

/**
 * Base class for series visual representations.
 */
export abstract class Hd3SeriesRenderer implements RenderableI {
  protected series: Hd3Series;
  protected xAxis?: Hd3XAxis;
  protected yAxis?: Hd3YAxis;
  protected group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected color: string;

  constructor(series: Hd3Series, xAxis?: Hd3XAxis, yAxis?: Hd3YAxis, color?: string) {
    this.series = series;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.color = color || this.getDefaultColor();
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

    // Listen to data changes
    this.series.on('dataChanged', () => this.renderData());
    this.series.on('visibilityChanged', (visible: unknown) => {
      this.setVisible(visible as boolean);
    });

    // Listen to axis changes
    if (this.xAxis) {
      this.xAxis.on('domainChanged', () => this.renderData());
      this.xAxis.on('rangeChanged', () => this.renderData());
    }
    if (this.yAxis) {
      this.yAxis.on('domainChanged', () => this.renderData());
      this.yAxis.on('rangeChanged', () => this.renderData());
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
}
