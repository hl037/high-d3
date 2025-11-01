import * as d3 from 'd3';
import { Hd3SeriesRenderer } from './Hd3SeriesRenderer';
import type { Hd3Series } from './Hd3Series';
import type { Hd3XAxisRenderer } from '../axis/Hd3XAxisRenderer';
import type { Hd3YAxisRenderer } from '../axis/Hd3YAxisRenderer';

export interface Hd3ScatterStyle {
  color?: string;
  radius?: number;
}

export interface Hd3ScatterOptions {
  series: Hd3Series;
  xAxisRenderer?: Hd3XAxisRenderer | string;
  yAxisRenderer?: Hd3YAxisRenderer | string;
  style?: Hd3ScatterStyle;
}

/**
 * Scatter series renderer.
 */
export class Hd3Scatter extends Hd3SeriesRenderer {
  private radius: number;

  constructor(options: Hd3ScatterOptions) {
    super({
      series: options.series,
      xAxisRenderer: options.xAxisRenderer,
      yAxisRenderer: options.yAxisRenderer,
      style: {
        color: options.style?.color
      }
    });
    this.radius = options.style?.radius || 4;
  }

  protected renderData(): void {
    if (!this.group || !this.xAxisRenderer || !this.yAxisRenderer) return;

    const data = this.series.data;

    // Remove existing circles
    this.group.selectAll('circle').remove();

    // Add circles
    this.group.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => this.getX(d))
      .attr('cy', d => this.getY(d))
      .attr('r', this.radius)
      .attr('fill', this.color);
  }
}
