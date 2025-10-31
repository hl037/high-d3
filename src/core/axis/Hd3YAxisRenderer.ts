import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3YAxis } from './Hd3YAxis';
import type { RenderableI } from '../interfaces/RenderableI';

export interface Hd3YAxisRendererOptions {
  axis: Hd3YAxis;
  position?: 'left' | 'right';
  tickCount?: number;
}

/**
 * Renders a Y axis on the chart.
 * Supports logarithmic scales.
 */
export class Hd3YAxisRenderer implements RenderableI {
  private axis: Hd3YAxis;
  private position: 'left' | 'right';
  private tickCount: number;
  private group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private visible: boolean = true;

  constructor(options: Hd3YAxisRendererOptions) {
    this.axis = options.axis;
    this.position = options.position || 'left';
    this.tickCount = options.tickCount || 10;
  }

  render(chart: Hd3Chart): void {
    const mainGroup = chart.getMainGroup();
    
    if (this.group) {
      this.group.remove();
    }

    const xPos = this.position === 'left' ? 0 : chart.innerWidth;
    
    this.group = mainGroup.append('g')
      .attr('class', `y-axis y-axis-${this.axis.name}`)
      .attr('transform', `translate(${xPos},0)`);

    this.updateAxis();

    // Listen to axis changes
    this.axis.on('domainChanged', () => this.updateAxis());
    this.axis.on('rangeChanged', () => this.updateAxis());
    
    // Listen to visibility changes
    chart.on(`axis-${this.axis.name}-visibility`, (visible: unknown) => {
      this.setVisible(visible as boolean);
    });
  }

  private updateAxis(): void {
    if (!this.group) return;

    const axisGenerator = this.position === 'left' 
      ? d3.axisLeft(this.axis.scale as d3.AxisScale<d3.NumberValue>)
      : d3.axisRight(this.axis.scale as d3.AxisScale<d3.NumberValue>);
    
    if (this.axis.logarithmic) {
      axisGenerator.ticks(this.tickCount, '.0e');
    } else {
      axisGenerator.ticks(this.tickCount);
    }

    this.group.call(axisGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.group) {
      this.group.style('display', visible ? null : 'none');
    }
  }
}
