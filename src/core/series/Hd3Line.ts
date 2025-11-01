import * as d3 from 'd3';
import { Hd3SeriesRenderer } from './Hd3SeriesRenderer';
import type { Hd3Series } from './Hd3Series';
import type { Hd3XAxisRenderer } from '../axis/Hd3XAxisRenderer';
import type { Hd3YAxisRenderer } from '../axis/Hd3YAxisRenderer';

export interface Hd3LineStyle {
  color?: string;
  strokeWidth?: number;
}

export interface Hd3LineOptions {
  series: Hd3Series;
  xAxisRenderer?: Hd3XAxisRenderer | string;
  yAxisRenderer?: Hd3YAxisRenderer | string;
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
      xAxisRenderer: options.xAxisRenderer,
      yAxisRenderer: options.yAxisRenderer,
      style: {
        color: options.style?.color
      }
    });
    this.strokeWidth = options.style?.strokeWidth || 2;
  }

  protected renderData(): void {
    if (!this.group || !this.xAxisRenderer || !this.yAxisRenderer) return;

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
