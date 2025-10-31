import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3XAxis } from './Hd3XAxis';
import type { RenderableI } from '../interfaces/RenderableI';

export interface Hd3XAxisRendererOptions {
  axis: Hd3XAxis;
  position?: 'bottom' | 'top';
  tickCount?: number;
}

/**
 * Renders an X axis on the chart.
 */
export class Hd3XAxisRenderer implements RenderableI {
  private axis: Hd3XAxis;
  private position: 'bottom' | 'top';
  private tickCount: number;
  private group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private visible: boolean = true;

  constructor(options: Hd3XAxisRendererOptions) {
    this.axis = options.axis;
    this.position = options.position || 'bottom';
    this.tickCount = options.tickCount || 10;
  }

  render(chart: Hd3Chart): void {
    const mainGroup = chart.getMainGroup();
    
    if (this.group) {
      this.group.remove();
    }

    const yPos = this.position === 'bottom' ? chart.innerHeight : 0;
    
    this.group = mainGroup.append('g')
      .attr('class', `x-axis x-axis-${this.axis.name}`)
      .attr('transform', `translate(0,${yPos})`);

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

    const axisGenerator = this.position === 'bottom' 
      ? d3.axisBottom(this.axis.scale as d3.AxisScale<d3.NumberValue>)
      : d3.axisTop(this.axis.scale as d3.AxisScale<d3.NumberValue>);
    
    axisGenerator.ticks(this.tickCount);

    this.group.call(axisGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.group) {
      this.group.style('display', visible ? null : 'none');
    }
  }
}
