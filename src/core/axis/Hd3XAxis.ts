import * as d3 from 'd3';
import { Hd3Axis, Hd3AxisOptions } from './Hd3Axis';
import type { Hd3Chart } from '../chart/Hd3Chart';

export interface Hd3XAxisGridOptions {
  enabled?: boolean;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
}

export interface Hd3XAxisOptions extends Hd3AxisOptions {
  position?: 'bottom' | 'top';
  tickCount?: number;
  grid?: Hd3XAxisGridOptions;
}

/**
 * Renders an X axis on the chart.
 */
export class Hd3XAxis extends Hd3Axis {
  private position: 'bottom' | 'top';
  private tickCount: number;
  private gridOptions: Hd3XAxisGridOptions;
  private group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gridGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected chart?: Hd3Chart;

  constructor(options: Hd3XAxisOptions) {
    super(options);
    this.position = options.position || 'bottom';
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
        .attr('class', `x-grid x-grid-${this.name}`);
    }

    const yPos = this.position === 'bottom' ? chart.innerHeight : 0;
    
    this.group = mainGroup.append('g')
      .attr('class', `x-axis x-axis-${this.name}`)
      .attr('transform', `translate(0,${yPos})`);

    this.updateRender();
  }

  protected updateRender(): void {
    if (!this.group || !this.chart) return;

    const axisGenerator = this.position === 'bottom' 
      ? d3.axisBottom(this._scale as d3.AxisScale<d3.NumberValue>)
      : d3.axisTop(this._scale as d3.AxisScale<d3.NumberValue>);
    
    axisGenerator.ticks(this.tickCount);

    this.group.call(axisGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);

    // Draw grid
    if (this.gridOptions.enabled && this.gridGroup) {
      const gridGenerator = d3.axisBottom(this._scale as d3.AxisScale<d3.NumberValue>)
        .tickSize(-this.chart.innerHeight)
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

  public getOrientation(): 'x' | 'y' {
    return 'x';
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
