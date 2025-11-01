import * as d3 from 'd3';
import { Hd3SeriesRenderer } from './Hd3SeriesRenderer';
import type { Hd3Series } from './Hd3Series';
import type { Hd3XAxisRenderer } from '../axis/Hd3XAxisRenderer';
import type { Hd3YAxisRenderer } from '../axis/Hd3YAxisRenderer';

export interface Hd3BarsStyle {
  color?: string;
  barWidth?: number;
}

export interface Hd3BarsOptions {
  series: Hd3Series;
  xAxisRenderer?: Hd3XAxisRenderer | string;
  yAxisRenderer?: Hd3YAxisRenderer | string;
  style?: Hd3BarsStyle;
}

/**
 * Bar series renderer.
 */
export class Hd3Bars extends Hd3SeriesRenderer {
  private barWidth: number;

  constructor(options: Hd3BarsOptions) {
    super({
      series: options.series,
      xAxisRenderer: options.xAxisRenderer,
      yAxisRenderer: options.yAxisRenderer,
      style: {
        color: options.style?.color
      }
    });
    this.barWidth = options.style?.barWidth || 20;
  }

  protected renderData(): void {
    if (!this.group || !this.xAxisRenderer || !this.yAxisRenderer) return;

    const data = this.series.data;
    const yScale = this.yAxisRenderer.scale as d3.ScaleLinear<number, number>;
    const y0 = yScale(0);

    // Remove existing bars
    this.group.selectAll('rect').remove();

    // Add bars
    this.group.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => this.getX(d) - this.barWidth / 2)
      .attr('y', d => Math.min(this.getY(d), y0))
      .attr('width', this.barWidth)
      .attr('height', d => Math.abs(this.getY(d) - y0))
      .attr('fill', this.color);
  }
}
