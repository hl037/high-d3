import * as d3 from 'd3';
import { Hd3SeriesRenderer, Hd3SeriesRendererOptions, Hd3SeriesRendererStyle } from './Hd3SeriesRenderer';
import { Hd3SeriesInterpolator } from './Hd3SeriesInterpolator';
import { Hd3Chart, Hd3ChartI } from '../chart/Hd3Chart';
import { Hd3Axis } from '../axis/Hd3Axis';

export interface Hd3ScatterStyle extends Hd3SeriesRendererStyle {
  radius?: number;
}

export interface Hd3ScatterOptions extends Hd3SeriesRendererOptions {
  style?: Hd3ScatterStyle;
}

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

interface ChartData {
  group: D3Group;
  lastPositions: [number, number][] | null;
}

/**
 * Scatter series renderer.
 */
export class Hd3Scatter extends Hd3SeriesRenderer {
  private radius: number;

  constructor(options: Hd3ScatterOptions) {
    super(options);
    this.radius = options.style?.radius || 4;
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
      chartData.lastPositions = [];
      return;
    }

    const newPositions: [number, number][] = data.map(d => [scaleX(d[0])!, scaleY(d[1])!]);
    const interpolate = new Hd3SeriesInterpolator(
      chartData.lastPositions || scaleY.range()[0],
      newPositions
    );

    const circles = chartData.group.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('class', 'point')
      .attr('r', this.radius)
      .attr('fill', this.color);

    chartData.group.transition()
      .duration(200)
      .tween('positions', () => {
        const nodes = circles.nodes() as SVGCircleElement[];
        return (t) => {
          chartData.lastPositions = interpolate(t);
          for (let i = 0; i < nodes.length; i++) {
            nodes[i].setAttribute('cx', String(chartData.lastPositions[i][0]));
            nodes[i].setAttribute('cy', String(chartData.lastPositions[i][1]));
          }
        };
      });
  }
}
