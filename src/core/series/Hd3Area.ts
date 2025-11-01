import * as d3 from 'd3';
import { Hd3SeriesRenderer } from './Hd3SeriesRenderer';
import type { Hd3Series } from './Hd3Series';
import type { Hd3XAxisRenderer } from '../axis/Hd3XAxisRenderer';
import type { Hd3YAxisRenderer } from '../axis/Hd3YAxisRenderer';

export interface Hd3AreaStyle {
  color?: string;
  opacity?: number;
}

export interface Hd3AreaOptions {
  series: Hd3Series;
  xAxisRenderer?: Hd3XAxisRenderer | string;
  yAxisRenderer?: Hd3YAxisRenderer | string;
  style?: Hd3AreaStyle;
}

/**
 * Area series renderer.
 */
export class Hd3Area extends Hd3SeriesRenderer {
  private opacity: number;

  constructor(options: Hd3AreaOptions) {
    super({
      series: options.series,
      xAxisRenderer: options.xAxisRenderer,
      yAxisRenderer: options.yAxisRenderer,
      style: {
        color: options.style?.color
      }
    });
    this.opacity = options.style?.opacity || 0.5;
  }

  protected renderData(): void {
    if (!this.group || !this.xAxisRenderer || !this.yAxisRenderer) return;

    const data = this.series.data;
    const yScale = this.yAxisRenderer.scale as d3.ScaleLinear<number, number>;
    const y0 = yScale(0);
    
    const area = d3.area<[unknown, number]>()
      .x(d => this.getX(d))
      .y0(y0)
      .y1(d => this.getY(d));

    // Remove existing path
    this.group.selectAll('path').remove();

    // Add area path
    this.group.append('path')
      .datum(data)
      .attr('class', 'area')
      .attr('fill', this.color)
      .attr('opacity', this.opacity)
      .attr('d', area);
  }
}
