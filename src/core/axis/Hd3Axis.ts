import * as d3 from 'd3';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { scaleFactory, ScaleType, D3Scale } from './scaleFactory';
import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3AxisDomain } from './Hd3AxisDomain';

export type Hd3AxisEvents = {
  visibilityChanged: boolean,
}

export interface Hd3AxisGridOptions {
  enabled?: boolean;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
}

export interface Hd3AxisOptions {
  bus?: Hd3Bus;
  name: string;
  axis: Hd3AxisDomain;
  orientation?: 'x' | 'y';
  position?: 'left' | 'right' | 'bottom' | 'top';
  scaleType?: ScaleType;
  range?: [number, number];
  scaleOptions?: {
    base?: number;
    exponent?: number;
  };
  tickCount?: number;
  grid?: Hd3AxisGridOptions;
}

/**
 * Renders an axis on the chart (X or Y).
 */
export class Hd3Axis implements RenderableI {
  bus: Hd3Bus;
  public name: string;
  protected axis: Hd3AxisDomain;
  protected position: 'left' | 'right' | 'bottom' | 'top';
  protected scaleType: ScaleType;
  protected _range: [number, number];
  protected _scale: D3Scale;
  protected scaleOptions: { base?: number; exponent?: number };
  protected tickCount: number;
  protected gridOptions: Hd3AxisGridOptions;
  protected _chart?: Hd3Chart;
  protected group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  protected gridGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
  public readonly e: Hd3EventNameMap<Hd3AxisEvents>;

  constructor(options: Hd3AxisOptions) {
    this.bus = options.bus || getHd3GlobalBus();
    this.name = options.name;
    this.axis = options.axis;
    this.position = options.position || (options.orientation === 'x' ? 'bottom' : 'left');
    this.scaleType = options.scaleType || 'linear';
    this._range = options.range || [0, 100];
    this.scaleOptions = options.scaleOptions || {};
    this.tickCount = options.tickCount || 10;
    this.gridOptions = {
      enabled: false,
      stroke: '#e0e0e0',
      strokeWidth: 1,
      strokeDasharray: '2,2',
      opacity: 0.7,
      ...options.grid
    };
    this._scale = this.createScale();
    this.e = {
      visibilityChanged: createHd3Event<boolean>(),
    }
  }

  protected createScale(): D3Scale {
    return scaleFactory(this.scaleType, {
      domain: this.axis.domain,
      range: this._range,
      ...this.scaleOptions
    });
  }

  get scale(): D3Scale {
    return this._scale;
  }

  get range(): [number, number] {
    return this._range;
  }

  set range(value: [number, number]) {
    this._range = value;
    this.updateScale();
  }

  get chart() {
    return this._chart;
  }

  set chart(_chart:Hd3Chart | undefined){
    if(this._chart) {
    const chart = this._chart;
      this.bus.off(chart.e.destroyed
    }
  }

  protected updateScale(): void {
    this._scale = this.createScale();
    if (this.chart) {
      this.updateRender();
    }
  }

  render(chart: Hd3Chart): void {
    this.chart = chart;

    const bus = getHd3GlobalBus();
    bus.on(this.axis.e.domainChanged, this.handleDomainChanged.bind(this));
    bus.on(this.e.visibilityChanged, this.setVisible.bind(this));
    bus.on(chart.e.destroyed, this.destroy.bind(this));

    this.doRender(chart);
  }

  private handleDomainChanged(): void {
    this.updateScale();
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
        .attr('class', `${this.orientation}-grid ${this.orientation}-grid-${this.name}`);
    }

    const transform = this.getTransform(chart);
    
    this.group = mainGroup.append('g')
      .attr('class', `${this.orientation}-axis ${this.orientation}-axis-${this.name}`)
      .attr('transform', transform);

    this.updateRender();
  }

  protected getTransform(chart: Hd3Chart): string {
    if (this.orientation === 'x') {
      const yPos = this.position === 'bottom' ? chart.innerHeight : 0;
      return `translate(0,${yPos})`;
    } else {
      const xPos = this.position === 'left' ? 0 : chart.innerWidth;
      return `translate(${xPos},0)`;
    }
  }

  protected updateRender(): void {
    if (!this.group || !this.chart) return;

    const axisGenerator = this.getAxisGenerator();
    axisGenerator.ticks(this.tickCount);

    this.group.call(axisGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);

    // Draw grid
    if (this.gridOptions.enabled && this.gridGroup) {
      const gridGenerator = this.getGridGenerator();
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

  protected getAxisGenerator() {
    const scale = this._scale as d3.AxisScale<d3.NumberValue>;
    
    if (this.orientation === 'x') {
      return this.position === 'bottom' ? d3.axisBottom(scale) : d3.axisTop(scale);
    } else {
      return this.position === 'left' ? d3.axisLeft(scale) : d3.axisRight(scale);
    }
  }

  protected getGridGenerator() {
    const scale = this._scale as d3.AxisScale<d3.NumberValue>;
    const tickSize = this.orientation === 'x' ? -this.chart!.innerHeight : -this.chart!.innerWidth;
    
    const generator = this.orientation === 'x' ? d3.axisBottom(scale) : d3.axisLeft(scale);
    return generator.tickSize(tickSize).tickFormat(() => '');
  }

  protected setVisible(visible: boolean): void {
    if (this.group) {
      this.group.style('display', visible ? 'block' : 'none');
    }
    if (this.gridGroup) {
      this.gridGroup.style('display', visible ? 'block' : 'none');
    }
  }

  destroy(): void {
    const bus = getHd3GlobalBus();
    bus.off(this.axis.e.domainChanged, this.handleDomainChanged.bind(this));
    bus.off(this.e.visibilityChanged, this.setVisible.bind(this));
    
    if (this.group) {
      this.group.remove();
    }
    if (this.gridGroup) {
      this.gridGroup.remove();
    }
    
    (this as any).chart = undefined;
    (this as any).axis = undefined;
    (this as any)._scale = undefined;
  }
}
