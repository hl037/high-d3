import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from './Hd3Series';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3Axis } from '../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';
import { AxesState, Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';
import { dirty, Hd3RenderableI, Hd3RenderTargetI } from '../managers/Hd3RenderManager';

export interface Hd3SeriesRendererEvents{
  visibilityChanged: boolean
}

export interface Hd3SeriesRendererStyle {
  color?: string;
}

export interface Hd3SeriesRendererOptions {
  bus?: Hd3Bus;
  series: Hd3Series;
  axes?: (Hd3Axis | string)[];
  chart: Hd3Chart;
  style?: Hd3SeriesRendererStyle;
}

/**
 * Base class for series visual representations.
 * Can accept axes directly, by name, or undefined (will use first available).
 */
export abstract class Hd3SeriesRenderer implements Hd3RenderableI {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3SeriesRendererEvents>;
  public readonly chart: Hd3Chart;
  protected series: Hd3Series;
  protected color: string;
  protected x?: Hd3Axis;
  protected y?: Hd3Axis;
  protected axisDiscovery: Hd3AxesDiscovery;
  protected group?: d3.Selection<SVGGElement, unknown, null, undefined>;

  constructor(options: Hd3SeriesRendererOptions) {
    this.setVisible = this.setVisible.bind(this);
    this.tagDirty = this.tagDirty.bind(this);
    this.handleAxisListChanged = this.handleAxisListChanged.bind(this)

    this.bus = options.bus || getHd3GlobalBus();
    this.chart = options.chart
    this.series = options.series;
    this.color = options.style?.color || this.getDefaultColor();
    if(options.axes) {
      this.axisDiscovery = new Hd3AxesDiscovery({bus: this.bus, axes: options.axes, charts:[options.chart]});
    }
    else {
      this.axisDiscovery = new Hd3AxesDiscovery({bus: this.bus, all: true, charts:[options.chart]});
    }

    this.e = {
      visibilityChanged: createHd3Event<boolean>(),
    };

    this.bus.on(this.e.visibilityChanged, this.setVisible);
    this.bus.on(this.series.e.dataChanged, this.tagDirty)
    this.bus.on(this.chart.e<Hd3AxisManagerEvents>()('axesListChanged'), this.handleAxisListChanged)
  }

  private getDefaultColor(): string {
    const colors = d3.schemeCategory10;
    const hash = this.series.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  handleAxisListChanged(axesState: AxesState){
    const newX = axesState.x[0];
    const newY = axesState.y[0];
    if(newX !== this.x) {
      if(this.x !== undefined) {
        this.bus.off(newX.axisDomain.e.domainChanged, this.tagDirty);
      }
      if(newX !== undefined) {
        this.bus.on(newX.axisDomain.e.domainChanged, this.tagDirty);
      }
    }

    if(newY !== this.y) {
      if(this.y !== undefined) {
        this.bus.off(newY.axisDomain.e.domainChanged, this.tagDirty);
      }
      if(newY !== undefined) {
        this.bus.on(newY.axisDomain.e.domainChanged, this.tagDirty);
      }
    }
    this.tagDirty()
  }

  tagDirty(){
    this.bus.emit(dirty, {target: this.chart, renderable: this})
  }

  render(chart: Hd3RenderTargetI): void {
    if(chart !== this.chart) {
      
    }
    const mainGroup = chart.getRenderTarget();
    
    if (this.group === undefined) {
      this.group = mainGroup.append('g')
        .attr('class', `series series-${this.series.name}`);
    }
    this.renderData()
  }

  protected abstract renderData(): void;

  protected setVisible(visible: boolean): void {
    if (this.group) {
      this.group.style('display', visible ? 'unset' : 'none');
    }
  }

  destroy(): void {
    this.axisDiscovery.destroy();
    if (this.group) {
      this.group.remove();
    }
  }
}
