import * as d3 from 'd3';
import type { Hd3Chart, Hd3ChartI } from '../chart/Hd3Chart';
import { Hd3Series } from './Hd3Series';
import type { Hd3Axis } from '../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';
import { AxesState, Hd3AxisManager, Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';
import { emitDirty, Hd3RenderableI, Hd3RenderTargetI } from '../managers/Hd3RenderManager';

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
  visible?: boolean
}

interface ChartData {
  tagDirty: () => void;
  data: object;
}

let currentId = 0;

/**
 * Base class for series visual representations.
 * Can accept axes directly, by name, or undefined (will use first available).
 */
export abstract class Hd3SeriesRenderer implements Hd3RenderableI<Hd3Chart> {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3SeriesRendererEvents>;
  public readonly chartData: Map<Hd3Chart, ChartData>;
  protected series: Hd3Series;
  protected color: string;
  public readonly id: number;
  protected _visible: boolean;
  private axes?: (Hd3Axis | string)[];

  constructor(options: Hd3SeriesRendererOptions) {
    this.setVisible = this.setVisible.bind(this);
    this.tagDirty = this.tagDirty.bind(this);
    this.handleDataChanged = this.handleDataChanged.bind(this);
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.id = currentId++;

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.series = options.series;
    this.color = options.style?.color || this.getDefaultColor();
    this.axes = options.axes;

    this.e = {
      visibilityChanged: createHd3Event<boolean>(),
      destroyed: createHd3Event<Hd3SeriesRenderer>(),
    };

    this.bus.on(this.e.visibilityChanged, this.setVisible);
    this.bus.on(this.series.e.dataChanged, this.handleDataChanged);
    this.bus.on(this.series.e.destroyed, this.destroy)
    this._visible = options.visible ?? true;
  }

  public addToChart(chart: Hd3Chart){
    if(!this.chartData.has(chart)) {
      const data = {
        tagDirty: () => this.tagDirty(chart),
        data: {}
      };
      this.chartData.set(chart, {tagDirty: data.tagDirty, data: {}});
      this.bus.on(chart.e.destroyed, this.removeFromChart);
      this.bus.on(chart.e<Hd3AxisManagerEvents>()('axesListChanged'), data.tagDirty);
      this.chartAdded(chart, data);
      this.tagDirty(chart);
    }
  }

  protected chartAdded(chart:Hd3Chart, data:object){
    
  }

  public removeFromChart(chart: Hd3Chart){
    const data = this.chartData.get(chart);
    if(data !== undefined) {
      this.chartRemoved(chart, data);
      this.bus.off(chart.e.destroyed, this.removeFromChart);
      this.bus.off(chart.e<Hd3AxisManagerEvents>()('axesListChanged'), data.tagDirty);
      this.chartData.delete(chart);
    }
  }
  
  protected chartRemoved(chart:Hd3Chart, data:object){
    
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

  render(chart: Hd3Chart): void {
    const {x, y} = this.getAxes(chart);
    this.renderData(chart, this.chartData.get(chart)!.data, x, y)
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
}
