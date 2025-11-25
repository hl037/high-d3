import * as d3 from 'd3';
import { Hd3SeriesRenderer, Hd3SeriesRendererOptions, Hd3SeriesRendererProps, Hd3SeriesRendererStyle } from './Hd3SeriesRenderer';
import { Hd3SeriesInterpolator } from './Hd3SeriesInterpolator';
import { Hd3Chart, Hd3ChartI } from '../chart/Hd3Chart';
import { Hd3Axis } from '../axis/Hd3Axis';

export interface Hd3AreaStyle extends Hd3SeriesRendererStyle {
  opacity: number;
}

export interface Hd3AreaProps extends Hd3SeriesRendererProps {
  style: Hd3AreaStyle;
}

export type Hd3AreaOptions = Hd3SeriesRendererOptions<Hd3AreaProps>;

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

interface ChartData {
  group: D3Group;
  lastPositions: [number, number][] | null;
}

/**
 * Area series renderer.
 */
export class Hd3Area extends Hd3SeriesRenderer<Hd3AreaProps> {
  getDefaultProps(): Hd3AreaProps {
    const base = super.getDefaultProps();
    base.style.opacity = 0.5;
    return base;
  }

  protected chartAdded(chart: Hd3Chart, _data: object) {
    const data = _data as ChartData;
    data.group = chart.layer.data.middle.append('g')
      .attr('class', `series-renderer-${this.id}`);
    data.lastPositions = null;
  }

  protected chartRemoved(_chart: Hd3Chart, _data: object) {
    const data = _data as ChartData;
    data.group.remove();
  }

  protected renderDataHidden(chart: Hd3ChartI, _chartData: object, _x: Hd3Axis | undefined, y: Hd3Axis | undefined): void {
    const chartData = _chartData as ChartData;
    const path = chartData.group.selectAll('path');
    
    const scaleY = y?.getScale(chart);
    
    if (!path.empty() && scaleY !== undefined) {
      const y0 = scaleY(0)!;
      const interpolate = new Hd3SeriesInterpolator(scaleY.range()[0], chartData.lastPositions!);
      
      const area = d3.area<[number, number]>()
        .x(d => d[0])
        .y0(y0)
        .y1(d => d[1]);

      chartData.group.selectAll('path')
        .data([null])
        .join('path')
        .interrupt()
        .transition()
        .attr('class', 'area')
        .attr('fill', this.props.style.color)
        .attr('opacity', 0)
        .duration(200)
        .attrTween('d', () => (t) => {
          chartData.lastPositions = interpolate(1 - t);
          return area(chartData.lastPositions)!;
        })
        .end()
        .then(() => {
          chartData.group.selectAll('path').remove();
        })
        .catch(() => {});
    }
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
      .attr('fill', this.props.style.color)
      .attr('opacity', this.props.style.opacity)
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
        .attr('fill', this.props.style.color)
        .attr('opacity', this.props.style.opacity)
        .attrTween('d', () => (t) => {
          chartData.lastPositions = interpolate(t);
          return area(chartData.lastPositions)!;
        })
  }
}
