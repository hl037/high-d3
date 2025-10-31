import * as d3 from 'd3';
import { Hd3SeriesRenderer } from './Hd3SeriesRenderer';
import type { Hd3Series } from './Hd3Series';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';

/**
 * Scatter series renderer.
 */
export class Hd3Scatter extends Hd3SeriesRenderer {
  private radius: number;

  constructor(series: Hd3Series, xAxis?: Hd3XAxis, yAxis?: Hd3YAxis, color?: string, radius: number = 4) {
    super(series, xAxis, yAxis, color);
    this.radius = radius;
  }

  protected renderData(): void {
    if (!this.group || !this.xAxis || !this.yAxis) return;

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
