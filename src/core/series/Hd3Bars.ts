import * as d3 from 'd3';
import { Hd3SeriesRenderer, Hd3SeriesRendererOptions, Hd3SeriesRendererProps, Hd3SeriesRendererStyle } from './Hd3SeriesRenderer';
import { Hd3Chart, Hd3ChartI } from '../chart/Hd3Chart';
import { Hd3Axis } from '../axis/Hd3Axis';

export interface Hd3BarsStyle extends Hd3SeriesRendererStyle {
  barWidth: number;
}

export interface Hd3BarsProps extends Hd3SeriesRendererProps {
  style: Hd3BarsStyle;
}

export type Hd3BarsOptions = Hd3SeriesRendererOptions<Hd3BarsProps>;

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

interface ChartData {
  group: D3Group;
}

/**
 * Bar series renderer.
 */
export class Hd3Bars extends Hd3SeriesRenderer<Hd3BarsProps> {
  
  getDefaultProps(): Hd3BarsProps {
    const base = super.getDefaultProps();
    base.style.barWidth = 20;
    return base;
  }

  protected chartAdded(chart: Hd3Chart, _data: object) {
    const data = _data as ChartData;
    data.group = chart.layer.data.middle.append('g')
      .attr('class', `series-renderer-${this.id}`);
  }

  protected chartRemoved(_chart: Hd3Chart, _data: object) {
    const data = _data as ChartData;
    data.group.remove();
  }

  protected renderDataHidden(chart: Hd3ChartI, _chartData: object, _x: Hd3Axis | undefined, y: Hd3Axis | undefined): void {
    const chartData = _chartData as ChartData;
    const rects = chartData.group.selectAll('rect');
    
    const scaleY = y?.getScale(chart);
    
    if (!rects.empty() && scaleY !== undefined) {
      const y0 = scaleY(0)!;
      
      chartData.group.selectAll('rect')
        .interrupt()
        .transition()
        .duration(200)
        .attr('y', y0)
        .attr('height', 0)
        .end()
        .then(() => {
          chartData.group.selectAll('rect').remove();
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
      return;
    }

    const y0 = scaleY(0)!;
    
    const style = this.props.style;

    chartData.group.selectAll('rect')
      .data(data)
      .join(
        enter => enter.append('rect')
          .attr('class', 'bar')
          .attr('x', d => scaleX(d[0])! - style.barWidth / 2)
          .attr('y', y0)
          .attr('width', style.barWidth)
          .attr('height', 0)
          .attr('fill', style.color),
        update => update,
        exit => exit
          .attr('y', y0)
          .attr('height', 0)
          .remove()
      )
      .attr('x', d => scaleX(d[0])! - style.barWidth / 2)
      .attr('y', d => Math.min(scaleY(d[1])!, y0))
      .attr('width', style.barWidth)
      .attr('height', d => Math.abs(scaleY(d[1])! - y0))
      .attr('fill', style.color);
  }
  
  protected renderDataWithTransition(chart: Hd3ChartI, _chartData: object, x: Hd3Axis | undefined, y: Hd3Axis | undefined): void {
    const chartData = _chartData as ChartData;
    const data = this.series.data;

    const scaleX = x?.getScale(chart);
    const scaleY = y?.getScale(chart);

    if (scaleX === undefined || scaleY === undefined) {
      chartData.group.selectChildren().remove();
      return;
    }

    const y0 = scaleY(0)!;
    
    const style = this.props.style;

    chartData.group.selectAll('rect')
      .data(data)
      .join(
        enter => enter.append('rect')
          .attr('class', 'bar')
          .attr('x', d => scaleX(d[0])! - style.barWidth / 2)
          .attr('y', y0)
          .attr('width', style.barWidth)
          .attr('height', 0)
          .attr('fill', style.color),
        update => update,
        exit => exit
          .transition()
          .duration(200)
          .attr('y', y0)
          .attr('height', 0)
          .remove()
      )
      .transition()
        .duration(200)
        .attr('x', d => scaleX(d[0])! - style.barWidth / 2)
        .attr('y', d => Math.min(scaleY(d[1])!, y0))
        .attr('width', style.barWidth)
        .attr('height', d => Math.abs(scaleY(d[1])! - y0))
        .attr('fill', style.color);
  }
}
