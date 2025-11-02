import * as d3 from 'd3';
import { Hd3SeriesRenderer } from './Hd3SeriesRenderer';
import type { Hd3Series } from './Hd3Series';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import type { Hd3Bus } from '../bus/Hd3Bus';

export interface Hd3AreaStyle {
  color?: string;
  opacity?: number;
}

export interface Hd3AreaOptions {
  series: Hd3Series;
  xAxis?: Hd3XAxis | string;
  yAxis?: Hd3YAxis | string;
  buses?: Hd3Bus[];
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
      xAxis: options.xAxis,
      yAxis: options.yAxis,
      buses: options.buses,
      style: {
        color: options.style?.color
      }
    });
    this.opacity = options.style?.opacity || 0.5;
  }

  protected renderData(): void {
    if (!this.group || !this.xAxis || !this.yAxis) return;

    const data = this.series.data;
    const yScale = this.yAxis.scale as d3.ScaleLinear<number, number>;
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
