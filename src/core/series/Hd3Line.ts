import * as d3 from 'd3';
import { Hd3SeriesRenderer, Hd3SeriesRendererOptions, Hd3SeriesRendererStyle } from './Hd3SeriesRenderer';

export interface Hd3LineStyle extends Hd3SeriesRendererStyle {
  strokeWidth?: number;
}

export interface Hd3LineOptions extends Hd3SeriesRendererOptions {
  style?: Hd3LineStyle;
}

/**
 * Line series renderer.
 */
export class Hd3Line extends Hd3SeriesRenderer {
  private strokeWidth: number;

  constructor(options: Hd3LineOptions) {
    super(options);
    this.strokeWidth = options.style?.strokeWidth || 2;
  }

  protected renderData(): void {
    const group = this.group!;

    const data = this.series.data;

    const scaleX = this.x?.getScale(this.chart);
    const scaleY = this.y?.getScale(this.chart);

    if(scaleX === undefined || scaleY === undefined) {
      group!.selectChildren().remove()
      return;
    }
    
    const line = d3.line<[number, number]>()
      .x(d => scaleX(d[0]) as number)
      .y(d => scaleY(d[1]) as number);

    group.selectAll('path')
      .data(data)
      .join('path')
      .attr('d', d => line(d))
      .transition()
        .duration(200)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', this.color)
        .attr('stroke-width', this.strokeWidth)
      .end();

  }
}
