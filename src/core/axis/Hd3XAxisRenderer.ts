import * as d3 from 'd3';
import { Hd3AxisRenderer, Hd3AxisRendererOptions } from './Hd3AxisRenderer';
import type { Hd3Chart } from '../chart/Hd3Chart';

export interface Hd3XAxisRendererOptions extends Hd3AxisRendererOptions {
  position?: 'bottom' | 'top';
  tickCount?: number;
}

/**
 * Renders an X axis on the chart.
 */
export class Hd3XAxisRenderer extends Hd3AxisRenderer {
  private position: 'bottom' | 'top';
  private tickCount: number;
  private group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private visible: boolean = true;

  constructor(options: Hd3XAxisRendererOptions) {
    super(options);
    this.position = options.position || 'bottom';
    this.tickCount = options.tickCount || 10;
  }

  protected doRender(chart: Hd3Chart): void {
    const mainGroup = chart.getMainGroup();
    
    if (this.group) {
      this.group.remove();
    }

    const yPos = this.position === 'bottom' ? chart.innerHeight : 0;
    
    this.group = mainGroup.append('g')
      .attr('class', `x-axis x-axis-${this.name}`)
      .attr('transform', `translate(0,${yPos})`);

    this.updateRender();
  }

  protected updateRender(): void {
    if (!this.group) return;

    const axisGenerator = this.position === 'bottom' 
      ? d3.axisBottom(this._scale as d3.AxisScale<d3.NumberValue>)
      : d3.axisTop(this._scale as d3.AxisScale<d3.NumberValue>);
    
    axisGenerator.ticks(this.tickCount);

    this.group.call(axisGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);
  }

  protected setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.group) {
      this.group.style('display', visible ? null : 'none');
    }
  }

  destroy(): void {
    super.destroy();
    if (this.group) {
      this.group.remove();
    }
  }
}
