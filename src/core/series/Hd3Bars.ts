import * as d3 from 'd3';
import { Hd3SeriesRenderer, Hd3SeriesRendererOptions, Hd3SeriesRendererProps, Hd3SeriesRendererStyle } from './Hd3SeriesRenderer';
import { Hd3Chart, Hd3ChartI } from '../chart/Hd3Chart';
import { Hd3Axis } from '../axis/Hd3Axis';

export interface Hd3BarsStyle extends Hd3SeriesRendererStyle {
  barWidth: number | undefined;
  offset: number;
  margin: number;
}

export interface Hd3BarsProps extends Hd3SeriesRendererProps {
  style: Hd3BarsStyle;
  count: number;
  index: number;
}

export type Hd3BarsOptions = Hd3SeriesRendererOptions<Hd3BarsProps>;

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

interface ChartData {
  group: D3Group;
}

type Scale = d3.ScaleContinuousNumeric<number, number> | d3.ScaleBand<any>;

function isBandScale(scale: Scale): scale is d3.ScaleBand<any> {
  return 'bandwidth' in scale;
}

/**
 * Bar series renderer.
 */
export class Hd3Bars extends Hd3SeriesRenderer<Hd3BarsProps> {

  getDefaultProps(): Hd3BarsProps {
    const base = super.getDefaultProps();
    return {
      ...base,
      style: {
        ...base.style,
        barWidth: undefined,
        offset: 0,
        margin: 0,
      },
      count: 1,
      index: 1,
    };
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

  private computeBarGeometry(scaleX: Scale): { barWidth: number; getX: (d: [any, number]) => number } {
    const style = this.props.style;
    const { count, index } = this.props;

    if (isBandScale(scaleX)) {
      const bandwidth = scaleX.bandwidth();
      const barWidthFrac = style.barWidth ?? 1;
      const totalWidth = bandwidth * barWidthFrac;
      const marginPx = totalWidth * style.margin;
      const slotWidth = totalWidth / count;
      const barWidth = slotWidth - marginPx;
      const slotOffset = (index - 1) * slotWidth;
      const offsetPx = style.offset * bandwidth;
      const baseOffset = (bandwidth - totalWidth) / 2;

      return {
        barWidth,
        getX: (d) => scaleX(d[0])! + baseOffset + slotOffset + marginPx / 2 + offsetPx,
      };
    } else {
      const barWidth = style.barWidth ?? 20;
      const offset = style.offset;

      return {
        barWidth,
        getX: (d) => scaleX(d[0])! - barWidth / 2 + offset,
      };
    }
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

    const scaleX = x?.getScale(chart) as Scale | undefined;
    const scaleY = y?.getScale(chart);

    if (scaleX === undefined || scaleY === undefined) {
      chartData.group.selectChildren().remove();
      return;
    }

    const y0 = scaleY(0)!;
    const style = this.props.style;
    const { barWidth, getX } = this.computeBarGeometry(scaleX);

    chartData.group.selectAll('rect')
      .data(data)
      .join(
        enter => enter.append('rect')
          .attr('class', 'bar')
          .attr('x', d => getX(d))
          .attr('y', y0)
          .attr('width', barWidth)
          .attr('height', 0)
          .attr('fill', style.color),
        update => update,
        exit => exit
          .attr('y', y0)
          .attr('height', 0)
          .remove()
      )
      .attr('x', d => getX(d))
      .attr('y', d => Math.min(scaleY(d[1])!, y0))
      .attr('width', barWidth)
      .attr('height', d => Math.abs(scaleY(d[1])! - y0))
      .attr('fill', style.color);
  }

  protected renderDataWithTransition(chart: Hd3ChartI, _chartData: object, x: Hd3Axis | undefined, y: Hd3Axis | undefined): void {
    const chartData = _chartData as ChartData;
    const data = this.series.data;

    const scaleX = x?.getScale(chart) as Scale | undefined;
    const scaleY = y?.getScale(chart);

    if (scaleX === undefined || scaleY === undefined) {
      chartData.group.selectChildren().remove();
      return;
    }

    const y0 = scaleY(0)!;
    const style = this.props.style;
    const { barWidth, getX } = this.computeBarGeometry(scaleX);

    chartData.group.selectAll('rect')
      .data(data)
      .join(
        enter => enter.append('rect')
          .attr('class', 'bar')
          .attr('x', d => getX(d))
          .attr('y', y0)
          .attr('width', barWidth)
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
        .attr('x', d => getX(d))
        .attr('y', d => Math.min(scaleY(d[1])!, y0))
        .attr('width', barWidth)
        .attr('height', d => Math.abs(scaleY(d[1])! - y0))
        .attr('fill', style.color);
  }
}
