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
  lastPositions: [number, number][] | null;
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
    data.lastPositions = null;
  }
  
  protected chartRemoved(chart:Hd3Chart, _data:object){
    const data = _data as ChartData;
    data.group.remove();
  }

  protected renderDataHidden(chart: Hd3ChartI, _chartData: object, x:Hd3Axis|undefined, y: Hd3Axis|undefined): void {
    const chartData = _chartData as ChartData;
    const path = chartData.group.selectAll('path');
    
    const scaleY = y?.getScale(chart);
    
    if(!path.empty() && scaleY !== undefined) {
      
      const interpolate = new Hd3SeriesInterpolator(scaleY.range()[0], chartData.lastPositions!);
      
      const line = d3.line<[number, number]>()
        .x(d => d[0])
        .y(d => d[1]);

      chartData.group.selectAll('path')
        .data([null])
        .join('path')
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', this.color)
        .interrupt()
        .transition()
          .duration(200)
          .attr('stroke-width', 0)
          .attrTween('d', () => (t) => {
            chartData.lastPositions = interpolate(1-t);
            return line(chartData.lastPositions)!;
          })
        .end()
        .then(() => {
          chartData.group.selectAll('path').remove();
        })
        .catch(() => {})
      }
    }

  protected renderData(chart: Hd3ChartI, _chartData: object, x:Hd3Axis|undefined, y: Hd3Axis|undefined): void {
    const chartData = _chartData as ChartData;
    console.log({
      'chartData' : chartData,
    });
    const data = this.series.data;

    const scaleX = x?.getScale(chart);
    const scaleY = y?.getScale(chart);

    if(scaleX === undefined || scaleY === undefined) {
      chartData.group.selectChildren().remove()
      chartData.lastPositions = null;
      return;
    }

    const newPositions: [number, number][] = data.map(d => [scaleX(d[0])!, scaleY(d[1])!]);
    chartData.lastPositions = newPositions;
    
    const line = d3.line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1]);

    chartData.group.selectAll('path')
      .data([data])
      .join('path')
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', this.color)
      .attr('stroke-width', this.strokeWidth)
      .interrupt()
      .attr('d', line(newPositions))
  }

  protected renderDataWithTransition(chart: Hd3ChartI, _chartData: object, x:Hd3Axis|undefined, y: Hd3Axis|undefined): void {
    const chartData = _chartData as ChartData;
    console.log({
      'chartData' : chartData,
    });
    const data = this.series.data;

    const scaleX = x?.getScale(chart);
    const scaleY = y?.getScale(chart);

    if(scaleX === undefined || scaleY === undefined) {
      chartData.group.selectChildren().remove()
      chartData.lastPositions = null;
      return;
    }

    const newPositions: [number, number][] = data.map(d => [scaleX(d[0])!, scaleY(d[1])!]);
    const interpolate = new Hd3SeriesInterpolator(chartData.lastPositions || scaleY.range()[0], newPositions);
    
    const line = d3.line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1]);

    chartData.group.selectAll('path')
      .data([data])
      .join('path')
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', this.color)
      .interrupt()
      .transition()
        .attr('stroke-width', this.strokeWidth)
        .duration(200)
        .attrTween('d', () => (t) => {
          chartData.lastPositions = interpolate(t);
          return line(chartData.lastPositions)!;
        })
  }
}
