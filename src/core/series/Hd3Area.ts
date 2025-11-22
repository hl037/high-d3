import * as d3 from 'd3';
import { Hd3SeriesRenderer, Hd3SeriesRendererOptions, Hd3SeriesRendererStyle } from './Hd3SeriesRenderer';
import { Hd3SeriesInterpolator } from './Hd3SeriesInterpolator';
import { Hd3Chart, Hd3ChartI } from '../chart/Hd3Chart';
import { Hd3Axis } from '../axis/Hd3Axis';

export interface Hd3AreaStyle extends Hd3SeriesRendererStyle {
  opacity?: number;
}

export interface Hd3AreaOptions extends Hd3SeriesRendererOptions {
  style?: Hd3AreaStyle;
}

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

interface ChartData {
  group: D3Group;
  lastPositions: [number, number][] | null;
}

/**
 * Area series renderer.
 */
export class Hd3Area extends Hd3SeriesRenderer {
  private opacity: number;

  constructor(options: Hd3AreaOptions) {
    super(options);
    this.opacity = options.style?.opacity || 0.5;
  }

  protected chartAdded(chart: Hd3Chart, _data: object) {
    const data = _data as ChartData;
    data.group = chart.layer.data.middle.append('g')
      .attr('class', `series-renderer-${this.id}`);
    data.lastPositions = null;
  }

  protected chartRemoved(chart: Hd3Chart, _data: object) {
    const data = _data as ChartData;
    data.group.remove();
  }

  protected renderData(chart: Hd3ChartI, _chartData: object, x: Hd3Axis | undefined, y: Hd3Axis | undefined): void {
    const chartData = _chartData as ChartData;
    const data = this.series.data;

    const scaleX = x?.getScale(chart);
    const scaleY = y?.getScale(chart);

    if (scaleX === undefined || scaleY === undefined) {
      chartData.group.selectChildren().remove();
      chartData.lastPositions = null;
      return;
    }

    const y0 = scaleY(0)!;

    const newPositions: [number, number][] = data.map(d => [scaleX(d[0])!, scaleY(d[1])!]);
    chartData.lastPositions = newPositions;

    const area = d3.area<[number, number]>()
      .x(d => d[0])
      .y0(y0)
      .y1(d => d[1]);

    chartData.group.selectAll('path')
      .data([data])
      .join('path')
      .attr('class', 'area')
      .interrupt()
      .attr('fill', this.color)
      .attr('opacity', this.opacity)
      .attr('d', area(newPositions))
  }
  
  protected renderDataWithTransition(chart: Hd3ChartI, _chartData: object, x: Hd3Axis | undefined, y: Hd3Axis | undefined): void {
    const chartData = _chartData as ChartData;
    const data = this.series.data;

    const scaleX = x?.getScale(chart);
    const scaleY = y?.getScale(chart);

    if (scaleX === undefined || scaleY === undefined) {
      chartData.group.selectChildren().remove();
      chartData.lastPositions = null;
      return;
    }

    const y0 = scaleY(0)!;

    const newPositions: [number, number][] = data.map(d => [scaleX(d[0])!, scaleY(d[1])!]);
    const interpolate = new Hd3SeriesInterpolator(chartData.lastPositions || scaleY.range()[0], newPositions);

    const area = d3.area<[number, number]>()
      .x(d => d[0])
      .y0(y0)
      .y1(d => d[1]);

    chartData.group.selectAll('path')
      .data([data])
      .join('path')
      .attr('class', 'area')
      .interrupt()
      .transition()
        .duration(200)
        .attr('fill', this.color)
        .attr('opacity', this.opacity)
        .attrTween('d', () => (t) => {
          chartData.lastPositions = interpolate(t);
          return area(chartData.lastPositions)!;
        })
  }
}
