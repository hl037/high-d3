import * as d3 from 'd3';
import { Hd3SeriesRenderer, Hd3SeriesRendererOptions, Hd3SeriesRendererStyle } from './Hd3SeriesRenderer';
import { Hd3SeriesInterpolator } from './Hd3SeriesInterpolator';
import { Hd3Chart, Hd3ChartI } from '../chart/Hd3Chart';
import { Hd3Axis } from '../axis/Hd3Axis';

export interface Hd3LineStyle extends Hd3SeriesRendererStyle {
  strokeWidth?: number;
}

export interface Hd3LineOptions extends Hd3SeriesRendererOptions {
  style?: Hd3LineStyle;
}

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

interface ChartData{
  group: D3Group;
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

  protected chartAdded(chart:Hd3Chart, _data:object){
    const data = _data as ChartData;
    data.group = chart.layer.data.middle.append('g')
    .attr('class', `series-renderer-${this.id}`);
  }
  
  protected chartRemoved(chart:Hd3Chart, _data:object){
    const data = _data as ChartData;
    data.group.remove();
  }


  protected renderData(chart: Hd3ChartI, _chartData: object, x:Hd3Axis|undefined, y: Hd3Axis|undefined): void {
    const chartData = _chartData as ChartData;
    const data = this.series.data;

    const scaleX = x?.getScale(chart);
    const scaleY = y?.getScale(chart);

    if(scaleX === undefined || scaleY === undefined) {
      chartData.group.selectChildren().remove()
      return;
    }

    const oldDatum = chartData.group.selectAll('path').datum() as unknown as [number, number][];
    const interpolate = (!oldDatum
      ? new Hd3SeriesInterpolator(scaleX.range()[0], data.map(d => [scaleX(d[0])!, scaleY(d[1])!]))
      : new Hd3SeriesInterpolator(oldDatum, data.map(d => [scaleX(d[0])!, scaleY(d[1])!]))
    );
    
    const line = d3.line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1]);

    chartData.group.selectAll('path')
      .datum(data)
      .join('path')
      .attr('d', d => line(d))
      .transition()
        .duration(200)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', this.color)
        .attr('stroke-width', this.strokeWidth)
        .attrTween('d', () => (t) => line(interpolate(t))!)
      .end();
  }
}
