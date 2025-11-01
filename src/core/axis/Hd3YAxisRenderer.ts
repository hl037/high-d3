import * as d3 from 'd3';
import { Hd3AxisRenderer, Hd3AxisRendererOptions } from './Hd3AxisRenderer';
import type { Hd3Chart } from '../chart/Hd3Chart';

export interface Hd3YAxisRendererOptions extends Hd3AxisRendererOptions {
  position?: 'left' | 'right';
  tickCount?: number;
}

/**
 * Renders a Y axis on the chart.
 */
export class Hd3YAxisRenderer extends Hd3AxisRenderer {
  private position: 'left' | 'right';
  private tickCount: number;
  private group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private visible: boolean = true;

  constructor(options: Hd3YAxisRendererOptions) {
    super(options);
    this.position = options.position || 'left';
    this.tickCount = options.tickCount || 10;
  }

  protected doRender(chart: Hd3Chart): void {
    const mainGroup = chart.getMainGroup();
    
    if (this.group) {
      this.group.remove();
    }

    const xPos = this.position === 'left' ? 0 : chart.innerWidth;
    
    this.group = mainGroup.append('g')
      .attr('class', `y-axis y-axis-${this.name}`)
      .attr('transform', `translate(${xPos},0)`);

    this.updateRender();
  }

  protected updateRender(): void {
    if (!this.group) return;

    const axisGenerator = this.position === 'left' 
      ? d3.axisLeft(this._scale as d3.AxisScale<d3.NumberValue>)
      : d3.axisRight(this._scale as d3.AxisScale<d3.NumberValue>);
    
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
