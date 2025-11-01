import * as d3 from 'd3';
import { Hd3Axis, Hd3AxisOptions } from './Hd3Axis';
import type { Hd3Chart } from '../chart/Hd3Chart';

export interface Hd3YAxisGridOptions {
  enabled?: boolean;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
}

export interface Hd3YAxisOptions extends Hd3AxisOptions {
  position?: 'left' | 'right';
  tickCount?: number;
  grid?: Hd3YAxisGridOptions;
}

/**
 * Renders a Y axis on the chart.
 */
export class Hd3YAxis extends Hd3Axis {
  private position: 'left' | 'right';
  private tickCount: number;
  private gridOptions: Hd3YAxisGridOptions;
  private group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gridGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected chart?: Hd3Chart;

  constructor(options: Hd3YAxisOptions) {
    super(options);
    this.position = options.position || 'left';
    this.tickCount = options.tickCount || 10;
    this.gridOptions = {
      enabled: false,
      stroke: '#e0e0e0',
      strokeWidth: 1,
      strokeDasharray: '2,2',
      opacity: 0.7,
      ...options.grid
    };
  }

  protected doRender(chart: Hd3Chart): void {
    this.chart = chart;
    const mainGroup = chart.getMainGroup();
    
    if (this.group) {
      this.group.remove();
    }
    if (this.gridGroup) {
      this.gridGroup.remove();
    }

    // Grid first (so it's behind the axis)
    if (this.gridOptions.enabled) {
      this.gridGroup = mainGroup.append('g')
        .attr('class', `y-grid y-grid-${this.name}`);
    }

    const xPos = this.position === 'left' ? 0 : chart.innerWidth;
    
    this.group = mainGroup.append('g')
      .attr('class', `y-axis y-axis-${this.name}`)
      .attr('transform', `translate(${xPos},0)`);

    this.updateRender();
  }

  protected updateRender(): void {
    if (!this.group || !this.chart) return;

    const axisGenerator = this.position === 'left' 
      ? d3.axisLeft(this._scale as d3.AxisScale<d3.NumberValue>)
      : d3.axisRight(this._scale as d3.AxisScale<d3.NumberValue>);
    
    axisGenerator.ticks(this.tickCount);

    this.group.call(axisGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);

    // Draw grid
    if (this.gridOptions.enabled && this.gridGroup) {
      const gridGenerator = d3.axisLeft(this._scale as d3.AxisScale<d3.NumberValue>)
        .tickSize(-this.chart.innerWidth)
        .tickFormat(() => '');
      
      gridGenerator.ticks(this.tickCount);

      this.gridGroup.call(gridGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);
      this.gridGroup.selectAll('line')
        .style('stroke', this.gridOptions.stroke!)
        .style('stroke-width', this.gridOptions.strokeWidth!)
        .style('stroke-dasharray', this.gridOptions.strokeDasharray!)
        .style('opacity', this.gridOptions.opacity!);
      this.gridGroup.select('.domain').remove();
    }
  }

  protected setVisible(visible: boolean): void {
    if (this.group) {
      this.group.style('display', visible ? 'block' : 'none');
    }
  }

  destroy(): void {
    super.destroy();
    if (this.group) {
      this.group.remove();
    }
    if (this.gridGroup) {
      this.gridGroup.remove();
    }
  }
}
