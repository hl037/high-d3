import * as d3 from 'd3';
import { scaleFactory, ScaleType } from './scaleFactory';
import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3AxisDomain } from './Hd3AxisDomain';
import { dirty, Hd3RenderableI, Hd3RenderTargetI } from '../managers/Hd3RenderManager';


export interface Hd3AxisVisibilityChangedEvent{
  target: Hd3RenderTargetI;
  visible: boolean;
}

export interface Hd3AxisEvents{
  visibilityChanged: Hd3AxisVisibilityChangedEvent;
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

interface AxisTargetData {
  group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  grid?:d3.Selection<SVGGElement, unknown, null, undefined>;
  visible: boolean;
  scale: d3.AxisScale<d3.AxisDomain>;
  axisGenerator: d3.Axis<d3.AxisDomain>;
}



/**
 * Renders an axis on the chart (X or Y).
 */
export class Hd3Axis implements Hd3RenderableI {
  bus: Hd3Bus;
  public name: string;
  protected axisDomain: Hd3AxisDomain;
  protected position: 'left' | 'right' | 'bottom' | 'top';
  protected orientation: 'x' | 'y'
  protected scaleType: ScaleType;
  protected _range: [number, number];
  protected _scale: d3.AxisScale<d3.AxisDomain>;
  protected scaleOptions: { base?: number; exponent?: number };
  protected tickCount: number;
  protected gridOptions: Hd3AxisGridOptions;
  protected targetData: Map<Hd3RenderTargetI, AxisTargetData>
  public readonly e: Hd3EventNameMap<Hd3AxisEvents>;

  constructor(options: Hd3AxisOptions) {
    this.handleDomainChanged = this.handleDomainChanged.bind(this);
    this._setVisible = this._setVisible.bind(this);
    this.handleTargetDestroyed = this.handleTargetDestroyed.bind(this);
    
    this.bus = options.bus || getHd3GlobalBus();
    this.name = options.name;
    this.axisDomain = options.axis;
    this.position = options.position || (options.orientation === 'x' ? 'bottom' : 'left');
    this.orientation = this.position === 'left' || this.position === 'right' ? 'y' : 'x';
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
    this.targetData = new Map()

    this.destroy = this.destroy.bind(this);
    this.e = {
      visibilityChanged: createHd3Event<Hd3AxisVisibilityChangedEvent>(),
    }
  }

  protected createScale(): d3.AxisScale<d3.AxisDomain> {
    return scaleFactory(this.scaleType, {
      domain: this.axisDomain.domain,
      range: this._range,
      ...this.scaleOptions
    }) as d3.AxisScale<d3.AxisDomain>;
  }

  get scale(): d3.AxisScale<d3.AxisDomain> {
    return this._scale;
  }

  get range(): [number, number] {
    return this._range;
  }

  set range(value: [number, number]) {
    this._range = value;
    this.updateScale();
  }

  protected updateScale(): void {
    this._scale = this.createScale();
    for(const target of this.targetData.keys()){
      this.bus.emit(dirty, {target, renderable: this});
    }
  }

  private handleDomainChanged(): void {
    this.updateScale();
  }

  protected handleTargetDestroyed(target: Hd3RenderTargetI){
    this.targetData.delete(target);
    this.bus.off(target.e.destroyed, this.handleTargetDestroyed);
  }

  protected getTargetData(target: Hd3RenderTargetI): AxisTargetData{
    const g = this.targetData.get(target);
    if(g !== undefined) {
      return g
    }
    else {
      this.bus.on(target.e.destroyed, this.handleTargetDestroyed)
      const scale = this.createScale();
      const axisGenerator = this.getAxisGenerator(scale)
      const g = {
        visible: true,
        scale,
        axisGenerator
      };
      this.targetData.set(target, g);
      return g;
    }

  }

  public render(target: Hd3RenderTargetI): void {
    const mainGroup = target.getRenderTarget();
    const g = this.getTargetData(target);
    
    // Grid first (so it's behind the axis)
    if (this.gridOptions.enabled && g.grid === undefined) {
      g.grid = mainGroup.append('g')
        .attr('class', `${this.orientation}-grid ${this.orientation}-grid-${this.name}`);
    }

    
    if(g.group === undefined) {
      g.group = mainGroup.append('g')
      .attr('class', `${this.orientation}-axis ${this.orientation}-axis-${this.name}`)

    }
    
    const transform = this.getTransform(target);
    g.group.attr('transform', transform);

    this.updateRender(target, g);
  }

  protected getTransform(chart: Hd3RenderTargetI): string {
    if (this.orientation === 'x') {
      const yPos = this.position === 'bottom' ? chart.innerHeight : 0;
      return `translate(0,${yPos})`;
    } else {
      const xPos = this.position === 'left' ? 0 : chart.innerWidth;
      return `translate(${xPos},0)`;
    }
  }

  protected updateRender(target: Hd3RenderTargetI, g: AxisTargetData): void {
    const axisGenerator = this.getAxisGenerator();
    axisGenerator.ticks(this.tickCount);

    g.group!.call(axisGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);

    // Draw grid
    if (this.gridOptions.enabled) {
      const gridGenerator = this.getGridGenerator(target);
      gridGenerator.ticks(this.tickCount);

      g.grid!.call(gridGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);
      g.grid!.selectAll('line')
        .style('stroke', this.gridOptions.stroke!)
        .style('stroke-width', this.gridOptions.strokeWidth!)
        .style('stroke-dasharray', this.gridOptions.strokeDasharray!)
        .style('opacity', this.gridOptions.opacity!);
      g.grid!.select('.domain').remove();
    }
  }

  protected getAxisGenerator<T extends d3.AxisDomain>(scale: d3.AxisScale<T>) {
    if (this.orientation === 'x') {
      return this.position === 'bottom' ? d3.axisBottom(scale) : d3.axisTop(scale);
    } else {
      return this.position === 'left' ? d3.axisLeft(scale) : d3.axisRight(scale);
    }
  }

  protected getGridGenerator(target: Hd3RenderTargetI) {
    const scale = this._scale as d3.AxisScale<d3.NumberValue>;
    const tickSize = this.orientation === 'x' ? -target.innerHeight : -target.innerWidth;
    
    const generator = this.orientation === 'x' ? d3.axisBottom(scale) : d3.axisLeft(scale);
    return generator.tickSize(tickSize).tickFormat(() => '');
  }

  protected _setVisible({target, visible}: Hd3AxisVisibilityChangedEvent) {
    const g = this.getTargetData(target)
    g.visible = visible;
    if (g.group) {
      g.group.style('display', visible ? 'block' : 'none');
    }
    if (g.grid) {
      g.grid.style('display', visible ? 'block' : 'none');
    }
  }

  public setVisible(visible: boolean, target?:Hd3RenderTargetI){
    if(target !== undefined) {
      this.bus.emit(this.e.visibilityChanged, {target, visible});
    }
    else {
      for(const target of this.targetData.keys()){
        this.bus.emit(this.e.visibilityChanged, {target, visible});
        
      }
    }
  }

  destroy(): void {
    const bus = getHd3GlobalBus();
    bus.off(this.axisDomain.e.domainChanged, this.handleDomainChanged);
    bus.off(this.e.visibilityChanged, this._setVisible);

    
    (this as any).bus = undefined;
    (this as any).axisDomain = undefined;
    (this as any)._scale = undefined;
  }
}
