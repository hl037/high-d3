import * as d3 from 'd3';
import type { Hd3Chart, Hd3ChartI } from '../chart/Hd3Chart';
import { Hd3Series } from './Hd3Series';
import type { Hd3Axis } from '../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';
import { emitDirty, Hd3RenderableI } from '../managers/Hd3RenderManager';
import { Hd3SeriesRendererManagerEvents } from '../managers/Hd3SeriesManager';

export interface Hd3SeriesRendererEvents{
  visibilityChanged: boolean;
  destroyed: Hd3SeriesRenderer;
}

export interface Hd3SeriesRendererStyle {
  color?: string;
}

export interface Hd3SeriesRendererOptions {
  bus?: Hd3Bus;
  series: Hd3Series;
  axes?: (Hd3Axis | string)[];
  style?: Hd3SeriesRendererStyle;
  visible?: boolean;
  name?: string;
}

interface ChartData {
  tagDirty: () => void;
  data: object;
  x?: Hd3Axis;
  y?: Hd3Axis;
}

let currentId = 0;

/**
 * Base class for series visual representations.
 * Can accept axes directly, by name, or undefined (will use first available).
 */
export abstract class Hd3SeriesRenderer implements Hd3RenderableI<Hd3Chart> {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3SeriesRendererEvents>;
  public readonly id: number;
  protected series: Hd3Series;
  protected color: string;
  protected _visible: boolean;
  private _name?: string;
  private axes?: (Hd3Axis | string)[];
  private chartData: Map<Hd3Chart, ChartData>;
  private axisRefCount: Map<Hd3Axis, number>;

  constructor(options: Hd3SeriesRendererOptions) {
    this.setVisible = this.setVisible.bind(this);
    this.tagDirty = this.tagDirty.bind(this);
    this.handleDataChanged = this.handleDataChanged.bind(this);
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.id = currentId++;

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.axisRefCount = new Map();
    this.series = options.series;
    this.color = options.style?.color || this.getDefaultColor();
    this.axes = options.axes;
    this._name = options.name;

    this.e = {
      visibilityChanged: createHd3Event<boolean>(`series-renderer[${this.name}].visibilityChanged`),
      destroyed: createHd3Event<Hd3SeriesRenderer>(`series-renderer[${this.name}].destroyed`),
    };

    this.bus.on(this.e.visibilityChanged, this.setVisible);
    this.bus.on(this.series.e.dataChanged, this.handleDataChanged);
    this.bus.on(this.series.e.destroyed, this.destroy)
    this._visible = options.visible ?? true;
  }

  public addToChart(chart: Hd3Chart){
    if(!this.chartData.has(chart)) {
      const chartData = {
        tagDirty: () => this.tagDirty(chart),
        data: {}
      };
      this.chartData.set(chart, chartData);
      this.bus.on(chart.e.destroyed, this.removeFromChart);
      this.bus.on(chart.e<Hd3AxisManagerEvents>()('axesListChanged'), chartData.tagDirty);
      this.chartAdded(chart, chartData.data);
      this.bus.emit(chart.e<Hd3SeriesRendererManagerEvents>()('addSeriesRenderer'), this);
      this.tagDirty(chart);
    }
  }

  protected chartAdded(_chart:Hd3Chart, _data:object){
    
  }

  public removeFromChart(chart: Hd3Chart){
    const chartData = this.chartData.get(chart);
    if(chartData !== undefined) {
      
      this.bus.emit(chart.e<Hd3SeriesRendererManagerEvents>()('removeSeriesRenderer'), this);
      this.chartRemoved(chart, chartData.data);
      this.bus.off(chart.e.destroyed, this.removeFromChart);
      this.bus.off(chart.e<Hd3AxisManagerEvents>()('axesListChanged'), chartData.tagDirty);
      this.chartData.delete(chart);
    }
  }
  
  protected chartRemoved(_chart:Hd3Chart, _data:object){
    
  }

  private getDefaultColor(): string {
    const colors = d3.schemeCategory10;
    const hash = this.series.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  protected handleDataChanged(){
    this.tagDirty();
  }

  tagDirty(chart?: Hd3Chart){
    if(chart === undefined) {
      for(const chart of this.chartData.keys()){
        emitDirty(this.bus, {target: chart, renderable: this})
      }
    }
    else {
      emitDirty(this.bus, {target: chart, renderable: this})
    }
  }

  private incAxesCount(ax: Hd3Axis): boolean{
    const count = this.axisRefCount.get(ax);
    if(count === undefined) {
      this.axisRefCount.set(ax, 1);
      return true;
    }
    this.axisRefCount.set(ax, count + 1);
    return false;
  }
  
  private decAxesCount(ax: Hd3Axis): boolean{
    const count = this.axisRefCount.get(ax);
    if(count === undefined) {
      throw new Error('Axes not used ???');
    }
    if(count === 1) {
      this.axisRefCount.delete(ax);
      return true;
    }
    this.axisRefCount.set(ax, count - 1);
    return false;
  }

  render(chart: Hd3Chart): void {
    const {x, y} = this.getAxes(chart);
    const chartData = this.chartData.get(chart)!;
    
    for(const [ax, old_ax] of [[x, chartData.x], [y, chartData.y]]){
      if(ax !== chartData.x) {
        if(old_ax !== undefined && this.decAxesCount(old_ax)) {
          this.bus.off(old_ax.axisDomain.e.domainChanged, chartData.tagDirty); // Destroyed is handled by the axis manager, that will emit a axesListChanged event.
        }
        if(ax !== undefined && this.incAxesCount(ax)) {
          this.bus.on(ax.axisDomain.e.domainChanged, chartData.tagDirty); // Destroyed is handled by the axis manager, that will emit a axesListChanged event.
        }
      }
    }

    this.renderData(chart, chartData!.data, x, y)
  }

  protected abstract renderData(chart: Hd3ChartI, chartData: object, x:Hd3Axis|undefined, y:Hd3Axis|undefined): void;

  protected setVisible(visible: boolean): void {
    if(this._visible !== visible) {
      this._visible = visible;
      this.tagDirty();
    }
    this._visible = visible;
  }

  get visible() {
    return this._visible;
  }

  getAxes(chart: Hd3Chart ):{x?:Hd3Axis, y?:Hd3Axis}{
    const res = {} as {x?:Hd3Axis, y?:Hd3Axis};
    this.bus.emit(chart.e<Hd3AxisManagerEvents>()('getAxisManager'), (manager:Hd3AxisManager) => {
      const state = manager.getAxesState(this.axes)
      res.x = state.x[0];
      res.y = state.y[0];
    })
    return res;
  }

  destroy(): void {
    this.bus.off(this.series.e.destroyed, this.handleDataChanged);
    for(const chart of this.chartData.keys()){
      this.removeFromChart(chart);
    }
    
    this.bus.off(this.e.visibilityChanged, this.setVisible);
    this.bus.off(this.series.e.dataChanged, this.handleDataChanged);
    this.bus.emit(this.e.destroyed, this);
    (this as any).series = null;
    (this as any).charts = null;
  }

  get name(): string{
    if(this._name === undefined) {
      return this.series.name;
    }
    return this._name;
  }

  set name(name:string|undefined){
    this._name = name;
  }
}
