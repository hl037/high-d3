import * as d3 from 'd3';
import { Hd3SeriesRenderer } from './Hd3SeriesRenderer';
import type { Hd3Series } from './Hd3Series';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import type { Hd3Bus } from '../bus/Hd3Bus';

export interface Hd3LineStyle {
  color?: string;
  strokeWidth?: number;
}

export interface Hd3LineOptions {
  series: Hd3Series;
  xAxis?: Hd3XAxis | string;
  yAxis?: Hd3YAxis | string;
  buses?: Hd3Bus[];
  style?: Hd3LineStyle;
}

/**
 * Line series renderer.
 */
export class Hd3Line extends Hd3SeriesRenderer {
  private strokeWidth: number;

  constructor(options: Hd3LineOptions) {
    super({
      series: options.series,
      xAxis: options.xAxis,
      yAxis: options.yAxis,
      buses: options.buses,
      style: {
        color: options.style?.color
      }
    });
    this.strokeWidth = options.style?.strokeWidth || 2;
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
