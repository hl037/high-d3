import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3SeriesRenderer } from '../series/Hd3SeriesRenderer';
import type { Hd3Axis } from '../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';
import { Hd3SeriesRendererManager, Hd3SeriesRendererManagerEvents } from '../managers/Hd3SeriesRenderManager';
import { Hd3InteractionArea, Hd3InteractionAreaManagerEvents, MouseEventData } from '../interaction/Hd3InteractionArea';
import { invertScale } from '../axis/invertScale';

export interface TooltipSeriesData {
  renderer: Hd3SeriesRenderer;
  x: number | string | Date;
  y: number;
  color: string;
}

export interface Hd3TooltipData {
  x: number;
  y: number;
  xSide: 'left' | 'right';
  ySide: 'top' | 'bottom';
  series: TooltipSeriesData[];
}

export interface Hd3TooltipManagerChartEvents {
  tooltipShow: Hd3TooltipData;
  tooltipHide: void;
}

export interface Hd3TooltipManagerEvents {
  show: Hd3TooltipData;
  hide: void;
  destroyed: Hd3TooltipManager;
}

export interface Hd3TooltipManagerOptions {
  bus?: Hd3Bus;
  series?: (Hd3SeriesRenderer|string)[];
  axes?: (Hd3Axis | string)[];
}

interface ChartData {
  interactionArea?: Hd3InteractionArea;
  handleMouseMove: (data: MouseEventData) => void;
  handleMouseLeave: () => void;
  handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => void;
}

interface AxisData {
  axis: Hd3Axis,
  scale: d3.AxisScale<d3.AxisDomain>,
  xDomain: d3.AxisDomain | undefined,
  xVp: number | undefined,
  isContinuous: boolean,
}

interface RendererData {
  renderer: Hd3SeriesRenderer,
  x?: Hd3Axis,
  y?: Hd3Axis,
}

/**
 * Tooltip manager that emits show/hide events with series data.
 */
export class Hd3TooltipManager {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3TooltipManagerEvents>;
  private chartData: Map<Hd3Chart, ChartData>;
  private seriesRenderers?: Set<string>;
  private axes?: (Hd3Axis | string)[];

  constructor(options: Hd3TooltipManagerOptions) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.seriesRenderers = options.series && new Set(options.series.map(r => typeof r === 'string' ? r:r.name));
    this.axes = options.axes;

    this.e = {
      show: createHd3Event<Hd3TooltipData>('tooltipManager.show'),
      hide: createHd3Event<void>('tooltipManager.hide'),
      destroyed: createHd3Event<Hd3TooltipManager>('tooltipManager.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    const chartData: ChartData = {
      handleMouseMove: (data: MouseEventData) => this.handleMouseMove(chart, data),
      handleMouseLeave: () => this.handleMouseLeave(),
      handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => {
        if (chartData.interactionArea !== undefined) {
          this.bus.off(chartData.interactionArea.e.mousemove, chartData.handleMouseMove);
          this.bus.off(chartData.interactionArea.e.mouseleave, chartData.handleMouseLeave);
        }
        chartData.interactionArea = interactionArea;
        if (chartData.interactionArea !== undefined) {
          this.bus.on(interactionArea.e.mousemove, chartData.handleMouseMove);
          this.bus.on(interactionArea.e.mouseleave, chartData.handleMouseLeave);
        }
      }
    };

    this.chartData.set(chart, chartData);

    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.emit(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), chartData.handleInteractionAreaChanged);
    this.bus.on(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), chartData.handleInteractionAreaChanged);
  }

  public removeFromChart(chart: Hd3Chart) {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    this.bus.off(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), chartData.handleInteractionAreaChanged);
    this.bus.off(chart.e.destroyed, this.removeFromChart);

    if (chartData.interactionArea) {
      this.bus.off(chartData.interactionArea.e.mousemove, chartData.handleMouseMove);
      this.bus.off(chartData.interactionArea.e.mouseleave, chartData.handleMouseLeave);
    }

    this.chartData.delete(chart);
  }

  private handleMouseMove(chartOrigin: Hd3Chart, mouseData: MouseEventData): void {
    const mappedCoords = mouseData.mappedCoords;
    const xAxisNames = Object.keys(mappedCoords);

    if (xAxisNames.length === 0) return;

    const yVpRatio = (mouseData.y) / chartOrigin.innerHeight;
    const globalSeriesData = this.getChartSeriesData(chartOrigin, yVpRatio, mappedCoords);
    if(!globalSeriesData?.series.length) {
      return;
    }
    this.bus.emit(chartOrigin.e<Hd3TooltipManagerChartEvents>()('tooltipShow'), globalSeriesData);
    const globalSeriesSet = new Set<string>(globalSeriesData.series.map(d => d.renderer.name));

    for (const chart of this.chartData.keys()) {
      if (chart === chartOrigin) {
        continue;
      }
      const chartSeriesData = this.getChartSeriesData(chart, yVpRatio, mappedCoords as Record<string, number>);
      if (!chartSeriesData?.series.length) {
        continue;
      }

      // Emit per-chart event
      this.bus.emit(chart.e<Hd3TooltipManagerChartEvents>()('tooltipShow'), chartSeriesData);

      for(const series of chartSeriesData.series){
        if(!globalSeriesSet.has(series.renderer.name) && series.renderer.name in mappedCoords) {
          globalSeriesSet.add(series.renderer.name);
          globalSeriesData.series.push(series);
        }
      }

    }

    const tooltipData: Hd3TooltipData = {
      x: mouseData.x,
      y: mouseData.y,
      xSide: mouseData.x > chartOrigin.innerWidth / 2 ? 'left' : 'right',
      ySide: mouseData.y > chartOrigin.innerHeight / 2 ? 'top' : 'bottom',
      series: globalSeriesData.series
    };

    this.bus.emit(this.e.show, tooltipData);
  }

  private getChartSeriesData(
    chartTarget: Hd3Chart,
    yVpRatio: number,
    mappedCoords: Record<string, string | number | Date | undefined>
  ): Hd3TooltipData | undefined {
    const { x: targetXAxes } = this.getAxes(chartTarget);

    if(!(targetXAxes?.length)) {
      return undefined;
    }
    
    const xAxisDataList = targetXAxes.map((ax) => {
      const xDomain = mappedCoords[ax.name];
      const scale = ax.getScale(chartTarget);
      return scale && {
        axis: ax,
        scale,
        xDomain,
        xVp: (xDomain && scale(xDomain)!) as number|undefined,
        
        isContinuous: (scale as any).invert !== undefined,
      }
    }).filter(d => d !== undefined);
    
    // First, find common X axes.
    // If zero, return undefined (can't show a tooltip)
    // If exactly one, everything is mapped according to it.
    // If several, check if all x values are maper to the same pixel +-1, else, log an error.
    //  Anyway, take the first axis and map from it.

    const commonXAxisDataList = xAxisDataList.filter(({xDomain}) => xDomain !== undefined)

    if(!commonXAxisDataList.length) {
      return undefined
    }
    
    const commonXAxisData:Record<string, AxisData> = Object.fromEntries(commonXAxisDataList.map(d => [d.axis.name, d]));

    let xVpValue:number|undefined = undefined;
    if(commonXAxisDataList.length > 1) {
      // Check xValue maps to the same x (except for categorical axis)
      for(const d of commonXAxisDataList){
        if(d.isContinuous) {
          if(xVpValue !== undefined){
            if (Math.abs(xVpValue - d.xVp!) > 1){
              console.error('Ambiguous x value for tooltips');
            }
            else {
              xVpValue = d.xVp;
            }
          }
        }
      }
    }

    if(xVpValue === undefined) {
      // Then there are only categorical axis... Take the mean as the xVpValue
      xVpValue = commonXAxisDataList.reduce((acc, d) => acc + d.xVp!, 0) / commonXAxisDataList.length;
    }

    const seriesRenderersData = this.getSeriesRenderers(chartTarget).filter(({x, y}) => (x && y));
    
    const seriesData: TooltipSeriesData[] = [];

    for (const {renderer, x} of seriesRenderersData) {
      const d = commonXAxisData[x!.name];

      // Get x value for this series (convert if needed)
      if(d.xDomain === undefined) {
        const inverted = invertScale(d.scale, xVpValue)
        if(inverted === undefined) {
          return undefined;
        }
        d.xDomain = inverted;
      }

      // Find closest point
      const data = renderer.series.data;
      const closestPoint = this.findClosestPoint(data, d.xDomain);

      if (!closestPoint) continue;

      seriesData.push({
        renderer,
        x: closestPoint[0],
        y: closestPoint[1],
        color: renderer.color || '#steelblue',
      });
    }

    let finalY = yVpRatio * chartTarget.innerHeight;

    return {
      x: xVpValue,
      y: finalY,
      xSide: xVpValue > chartTarget.innerWidth / 2 ? 'left' : 'right',
      ySide: finalY > chartTarget.innerHeight / 2 ? 'top' : 'bottom',
      series: seriesData,
    };
  }

  private findClosestPoint(
    data: [number | string | Date, number][],
    xValue: d3.AxisDomain
  ): [number | string | Date, number] | undefined {
    if (data.length === 0) return undefined;

    if (typeof xValue === 'number' || xValue instanceof Date) {
      const bisector = d3.bisector<[number | string | Date, number], number | Date>(d => d[0] as number | Date).center;
      const idx = bisector(data, xValue);
      return data[Math.min(idx, data.length - 1)];
    } else {
      return data.find(p => p[0] === xValue) || data[0];
    }
  }

  private getSeriesRenderers(chart: Hd3Chart): RendererData[] {
    let renderers: RendererData[] = [];
    this.bus.emit(
      chart.e<Hd3SeriesRendererManagerEvents>()('getSeriesRendererManager'),
      (manager: Hd3SeriesRendererManager) => {
        if(this.seriesRenderers !== undefined) {
          renderers = manager.getSeries().filter(r => this.seriesRenderers!.has(r.name)).map(renderer => ({renderer, ...renderer.getAxes(chart)}));
        }
        else {
          renderers = manager.getSeries().map(renderer => ({renderer, ...renderer.getAxes(chart)}));
        }
      }
    );
    return renderers;
  }

  private handleMouseLeave(): void {
    for (const chart of this.chartData.keys()) {
      this.bus.emit(chart.e<Hd3TooltipManagerChartEvents>()('tooltipHide'), undefined);
    }
    this.bus.emit(this.e.hide, undefined);
  }

  private getAxes(chart: Hd3Chart): { x?: Hd3Axis[]; y?: Hd3Axis[] } {
    const res: { x?: Hd3Axis[]; y?: Hd3Axis[] } = {};
    this.bus.emit(chart.e<Hd3AxisManagerEvents>()('getAxisManager'), (manager: Hd3AxisManager) => {
      const state = manager.getAxesState(this.axes);
      res.x = state.x;
      res.y = state.y;
    });
    return res;
  }

  destroy(): void {
    for (const chart of [...this.chartData.keys()]) {
      this.removeFromChart(chart);
    }
    this.bus.emit(this.e.destroyed, this);
    (this as any).seriesRenderers = null;
    (this as any).chartData = null;
  }
}
