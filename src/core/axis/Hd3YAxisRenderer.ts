import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3YAxis } from './Hd3YAxis';
import type { RenderableI } from '../interfaces/RenderableI';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';

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
  private axisBusEndpoint?: Hd3BusEndpoint;
  private chartBusEndpoint?: Hd3BusEndpoint;

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

    // Connect to axis bus
    this.axisBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        domainChanged: () => this.updateAxis(),
        rangeChanged: () => this.updateAxis()
      }
    });
    this.axisBusEndpoint.bus = this.axis.getBus();
    
    // Connect to chart bus for visibility
    this.chartBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        [`axis-${this.axis.name}-visibility`]: (visible: unknown) => {
          this.setVisible(visible as boolean);
        }
      }
    });
    this.chartBusEndpoint.bus = chart.getBus();
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

  destroy(): void {
    this.axisBusEndpoint?.destroy();
    this.chartBusEndpoint?.destroy();
    if (this.group) {
      this.group.remove();
    }
  }
}
