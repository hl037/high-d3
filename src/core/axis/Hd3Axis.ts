import * as d3 from 'd3';
import { scaleFactory, ScaleType } from './scaleFactory';
import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3AxisDomain } from './Hd3AxisDomain';
import { emitDirty, Hd3RenderableI, Hd3RenderTargetI } from '../managers/Hd3RenderManager';
import { Hd3ChartI } from '../chart/Hd3Chart';
import { Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';
import { MergingDict } from '../utils/MergingDict';
import { mergingDictProps } from '../utils/mergingDictProps';


export type Hd3AxisComponent = 'x' | 'y'
export type Hd3AxisPosition = 'bottom' | 'top' | 'left' | 'right'

export interface Hd3AxisEvents{
  visibilityChanged: Hd3AxisVisibilityChangedEvent;
  scaleChanged: null;
  destroyed: Hd3Axis;
}

export interface Hd3AxisVisibilityChangedEvent{
  target: Hd3ChartI;
  visible: boolean;
}

export interface Hd3AxisGridOptions {
  enabled?: boolean;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
}

export interface Hd3AxisProps {
  displayName: string;
  grid: Partial<Hd3AxisGridOptions>;
  tickFormat: (value: d3.AxisDomain) => d3.AxisDomain;
  postProcess: (group: d3.Selection<SVGGElement, unknown, null, undefined>) => void;
}
export interface Hd3AxisOptions {
  bus?: Hd3Bus;
  name: string;
  domain: Hd3AxisDomain;
  component?: Hd3AxisComponent;
  position?: Hd3AxisPosition;
  scaleType?: ScaleType;
  range?: [number, number];
  scaleOptions?: {
    base?: number;
    exponent?: number;
  };
  tickCount?: number;
  props?: Partial<Hd3AxisProps>;
}

interface AxisTargetData {
  group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  grid?:d3.Selection<SVGGElement, unknown, null, undefined>;
  visible: boolean;
  scale: d3.AxisScale<d3.AxisDomain>;
  axisGenerator: d3.Axis<d3.AxisDomain>;
  offset: number; // Offset relative to the normal position of the axis
  handleResize: () => void;
}



/**
 * Renders an axis on the chart (X or Y).
 */
export class Hd3Axis implements Hd3RenderableI<Hd3ChartI> {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3AxisEvents>;
  public name: string;
  public readonly axisDomain: Hd3AxisDomain;
  public readonly position: Hd3AxisPosition;
  public readonly component: Hd3AxisComponent;
  protected scaleType: ScaleType;
  protected scaleOptions: { base?: number; exponent?: number };
  protected tickCount: number;
  public get props(): MergingDict<Hd3AxisProps>{throw "init threw mergingDictAttr"};
  public set props(_: Partial<Hd3AxisProps>){throw "init threw mergingDictAttr"};
  protected targetData: Map<Hd3ChartI, AxisTargetData>

  constructor(options: Hd3AxisOptions) {
    this.handleDomainChanged = this.handleDomainChanged.bind(this);
    this._setVisible = this._setVisible.bind(this);
    this.handleTargetDestroyed = this.handleTargetDestroyed.bind(this);
    
    this.bus = options.bus || getHd3GlobalBus();
    this.name = options.name;
    this.axisDomain = options.domain;
    this.position = options.position || (options.component === 'x' ? 'bottom' : 'left');
    this.component = this.position === 'left' || this.position === 'right' ? 'y' : 'x';
    this.scaleType = options.scaleType || 'linear';
    this.scaleOptions = options.scaleOptions || {};
    this.tickCount = options.tickCount || 10;
    this.targetData = new Map()

    this.destroy = this.destroy.bind(this);
    this.e = {
      visibilityChanged: createHd3Event<Hd3AxisVisibilityChangedEvent>(`axis[${this.name}].visibilityChanged`),
      scaleChanged: createHd3Event<null>(`axis[${this.name}].scaleChanged`),
      destroyed: createHd3Event<Hd3Axis>(`axis[${this.name}].destroyed`),
    }
    
    mergingDictProps(this, options.props);

    this.bus.on(this.axisDomain.e.domainChanged, this.handleDomainChanged);
  }

  getDefaultProps():Hd3AxisProps{
    return {
      displayName: this.name,
      grid: {
        enabled: false,
        stroke: '#000',
        strokeWidth: 1,
        strokeDasharray: '2,2',
        opacity: 0.3,
      },
      tickFormat: d => d,
      postProcess: () => {},
    };
  }

  public addToChart(target: Hd3ChartI, offset:number=0){
    const scale = this.createScale(target);
    const axisGenerator = this.getAxisGenerator(scale)
    const targetData = {
      visible: true,
      scale,
      axisGenerator,
      offset,
      handleResize: () => {
        targetData.scale = this.createScale(target);
        this.tagDirty(target)
        this.bus.emit(this.e.scaleChanged, null);
      }
    };
    this.targetData.set(target, targetData);
    this.bus.emit(target.e<Hd3AxisManagerEvents>()('addAxis'), this);
    this.bus.on(target.e.destroyed, this.handleTargetDestroyed)
    this.bus.on(target.e.resized, targetData.handleResize)
    this.tagDirty(target)
  }

  public removeFromChart(target: Hd3ChartI){
    const targetData = this.targetData.get(target)!;
    this.bus.off(target.e.resized, targetData.handleResize)
    this.bus.off(target.e.destroyed, this.handleTargetDestroyed)
    this.targetData.delete(target);
    this.bus.emit(target.e<Hd3AxisManagerEvents>()('removeAxis'), this);
  }
  
  public setOffset(target: Hd3ChartI, offset:number=0){
    const data = this.getTargetData(target);
    data.offset = offset;
    this.tagDirty(target)
  }

  
  tagDirty(chart?: Hd3ChartI) {
    if (chart === undefined) {
      for (const c of this.targetData.keys()) {
        emitDirty(this.bus, { target: c, renderable: this });
      }
    } else {
      emitDirty(this.bus, { target: chart, renderable: this });
    }
  }

  public getScale(target: Hd3ChartI){
    return this.targetData.get(target)?.scale
  }

  protected createScale(target:Hd3ChartI): d3.AxisScale<d3.AxisDomain> {
    return scaleFactory(this.scaleType, {
      domain: this.axisDomain.domain,
      range: (
        this.component === 'x' ?
        [0, target.innerWidth] :
        [target.innerHeight, 0]
      ),
      ...this.scaleOptions
    }) as d3.AxisScale<d3.AxisDomain>;
  }

  private handleDomainChanged(newDomain: Iterable<d3.AxisDomain>): void {
    for(const [target, targetData] of this.targetData.entries()){
      (targetData.scale.domain as any)(newDomain);
      this.tagDirty(target)
      this.bus.emit(this.e.scaleChanged, null)
    }
  }

  protected handleTargetDestroyed(target: Hd3RenderTargetI){
    this.removeFromChart(target as Hd3ChartI);
  }

  protected getTargetData(target: Hd3ChartI): AxisTargetData{
    const targetData = this.targetData.get(target);
    if(targetData !== undefined) {
      return targetData
    }
    else {
      throw new Error("axis not added to chart");
    }
  }

  public render(target: Hd3ChartI): void {
    // INFO - 2025-11-27 -- LF HAUCHECORNE : if a dirty event has been emitted before a destroy, we simply need to ignore.
    if(this.bus === undefined) {
      return;
    }
    const targetData = this.getTargetData(target);
    
    // Grid first (so it's behind the axis)
    if (this.props.grid.enabled && targetData.grid === undefined) {
      targetData.grid = target.layer.axis.append('g')
        .attr('class', `${this.component}-grid ${this.component}-grid-${this.name}`)
        .style('fill', 'none')  // No background fill
        .style('pointer-events', 'none');  // Optional: prevent interaction blocking
    }
    else if(!this.props.grid.enabled && targetData.grid !== undefined) {
      targetData.grid.remove();
      targetData.grid = undefined;
    }

    
    if(targetData.group === undefined) {
      targetData.group = target.layer.axis.append('g')
        .attr('class', `${this.component}-axis ${this.component}-axis-${this.name}`)

    }
    
    const transform = this.getTransform(target, targetData);
    targetData.group.attr('transform', transform);
    
    if (targetData.grid) {
      targetData.grid.attr('transform', transform);
    }

    this.updateRender(target, targetData);
  }

  public getCharts(): Hd3ChartI[] {
    return [...this.targetData.keys()]
  }

  protected _getTranslation(target: Hd3ChartI, targetData: AxisTargetData): {x:number, y:number}{
    if (this.component === 'x') {
      return {
        x: 0,
        y: (this.position === 'bottom' ? target.innerHeight : 0) + targetData.offset,
      }
    } else {
      return {
        x: (this.position === 'left' ? 0 : target.innerWidth) + targetData.offset,
        y: 0,
      };
    }
    
  }

  public getTranslation(target: Hd3ChartI): {x:number, y:number}{
    return this._getTranslation(target, this.getTargetData(target));
  }

  protected getTransform(target: Hd3ChartI, targetData: AxisTargetData): string {
    const translation = this._getTranslation(target, targetData);
    return `translate(${translation.x},${translation.y})`;
  }

  protected updateRender(target: Hd3ChartI, g: AxisTargetData): void {
    const axisGenerator = this.getAxisGenerator(g.scale);
    axisGenerator.ticks(this.tickCount);

    g.group!.call(axisGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);

    // Draw grid
    if (this.props.grid.enabled) {
      const gridGenerator = this.getGridGenerator(target, g);
      gridGenerator.ticks(this.tickCount);

      g.grid!.call(gridGenerator as (selection: d3.Selection<SVGGElement, unknown, null, undefined>) => void);
      g.grid!.selectAll('line')
        .style('stroke', this.props.grid.stroke!)
        .style('stroke-width', this.props.grid.strokeWidth!)
        .style('stroke-dasharray', this.props.grid.strokeDasharray!)
        .style('opacity', this.props.grid.opacity!);
      g.grid!.select('.domain').remove();
    }
    g.group!.call(this.props.postProcess);
  }

  protected getAxisGenerator<T extends d3.AxisDomain>(scale: d3.AxisScale<T>) {
    if (this.component === 'x') {
      return this.position === 'bottom' ? d3.axisBottom(scale) : d3.axisTop(scale);
    } else {
      return this.position === 'left' ? d3.axisLeft(scale) : d3.axisRight(scale);
    }
  }

  protected getGridGenerator(target: Hd3ChartI, g:AxisTargetData) {
    const tickSize = this.component === 'x' ? -target.innerHeight : -target.innerWidth;
    
    const generator = this.component === 'x' ? d3.axisBottom(g.scale) : d3.axisLeft(g.scale);
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

  public setVisible(visible: boolean, target?:Hd3ChartI){
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
    for(const target of [...this.targetData.keys()]){
      this.removeFromChart(target)
    }
    this.bus.emit(this.e.destroyed, this);
    this.bus.off(this.axisDomain.e.domainChanged, this.handleDomainChanged);
    this.bus.off(this.e.visibilityChanged, this._setVisible);
    
    (this as any).axisDomain = undefined;
    (this as any).bus = undefined;
  }
}
