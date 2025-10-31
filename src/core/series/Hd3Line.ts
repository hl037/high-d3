import * as d3 from 'd3';
import { Hd3SeriesRenderer } from './Hd3SeriesRenderer';
import type { Hd3Series } from './Hd3Series';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';

/**
 * Line series renderer.
 */
export class Hd3Line extends Hd3SeriesRenderer {
  private strokeWidth: number;

  constructor(series: Hd3Series, xAxis?: Hd3XAxis, yAxis?: Hd3YAxis, color?: string, strokeWidth: number = 2) {
    super(series, xAxis, yAxis, color);
    this.strokeWidth = strokeWidth;
  }

  protected renderData(): void {
    if (!this.group || !this.xAxis || !this.yAxis) return;

    const data = this.series.data;
    
    const line = d3.line<[unknown, number]>()
      .x(d => this.getX(d))
      .y(d => this.getY(d));

    // Remove existing path
    this.group.selectAll('path').remove();

    // Add line path
    this.group.append('path')
      .datum(data)
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', this.color)
      .attr('stroke-width', this.strokeWidth)
      .attr('d', line);
  }
}
