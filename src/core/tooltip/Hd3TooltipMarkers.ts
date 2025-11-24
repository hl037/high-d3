import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3TooltipData, TooltipSeriesData, Hd3TooltipManagerChartEvents } from './Hd3TooltipManager';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';
import { emitDirty, Hd3RenderableI } from '../managers/Hd3RenderManager';
import { MergingDict, mergingDictAttr } from '../utils/MergingDict';

export interface Hd3TooltipMarkersProps {
  radius: number;
  strokeWidth: number;
  overshoot: boolean;
}

export interface Hd3TooltipMarkersOptions {
  bus?: Hd3Bus;
  props?: Partial<Hd3TooltipMarkersProps>;
}

export interface Hd3TooltipMarkersEvents {
  destroyed: Hd3TooltipMarkers;
}

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

interface ChartData {
  group: D3Group;
  tooltipData: Hd3TooltipData | null;
  handleShow: (data: Hd3TooltipData) => void;
  handleHide: () => void;
}

/**
 * Tooltip markers that display circles on series points.
 */
export class Hd3TooltipMarkers implements Hd3RenderableI<Hd3Chart> {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3TooltipMarkersEvents>;
  public get props(): MergingDict<Hd3TooltipMarkersProps>{throw "init threw mergingDictAttr"};
  public set props(_:Hd3TooltipMarkersProps){throw "init threw mergingDictAttr"};
  private chartData: Map<Hd3Chart, ChartData>;

  constructor(options: Hd3TooltipMarkersOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();

    mergingDictAttr(
      this,
      'props',
      {
        radius: 4,
        strokeWidth: 2,
        overshoot: true,
      },
      {
        afterSet: () =>{
          this.tagDirty();
        }
      },
    )
    if(options.props !== undefined) {
      this.props(options.props);
    }

    this.e = {
      destroyed: createHd3Event<Hd3TooltipMarkers>('tooltipMarkers.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    const group = chart.layer.overlay.append('g')
      .attr('class', 'tooltip-markers')
      .style('pointer-events', 'none');

    const chartData: ChartData = {
      group,
      tooltipData: null,
      handleShow: (data: Hd3TooltipData) => {
        chartData.tooltipData = data;
        this.tagDirty(chart);
      },
      handleHide: () => {
        chartData.tooltipData = null;
        this.tagDirty(chart);
      }
    };

    this.chartData.set(chart, chartData);

    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.on(chart.e<Hd3TooltipManagerChartEvents>()('tooltipShow'), chartData.handleShow);
    this.bus.on(chart.e<Hd3TooltipManagerChartEvents>()('tooltipHide'), chartData.handleHide);
  }

  public removeFromChart(chart: Hd3Chart) {
    const data = this.chartData.get(chart);
    if (!data) return;

    data.group.remove();
    this.bus.off(chart.e.destroyed, this.removeFromChart);
    this.bus.off(chart.e<Hd3TooltipManagerChartEvents>()('tooltipShow'), data.handleShow);
    this.bus.off(chart.e<Hd3TooltipManagerChartEvents>()('tooltipHide'), data.handleHide);
    this.chartData.delete(chart);
  }

  tagDirty(chart?: Hd3Chart) {
    if (chart === undefined) {
      for (const c of this.chartData.keys()) {
        emitDirty(this.bus, { target: c, renderable: this });
      }
    } else {
      emitDirty(this.bus, { target: chart, renderable: this });
    }
  }

  render(chart: Hd3Chart) {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    if (!chartData.tooltipData) {
      this.hideMarkers(chartData.group);
      return;
    }

    this.renderMarkers(chart, chartData.group, chartData.tooltipData);
  }

  private renderMarkers(chart: Hd3Chart, group: D3Group, tooltipData: Hd3TooltipData) {
    const { x: xAxes, y: yAxes } = this.getAxes(chart);
    
    if (!xAxes?.length || !yAxes?.length) return;

    // Convert series data to marker positions
    const markerData: Array<TooltipSeriesData & { cx: number; cy: number }> = [];

    for (const series of tooltipData.series) {
      // Find axes for this series (for now use first available)
      const xAxis = xAxes[0];
      const yAxis = yAxes[0];

      const scaleX = xAxis?.getScale(chart);
      const scaleY = yAxis?.getScale(chart);

      if (!scaleX || !scaleY) continue;

      const cx = scaleX(series.x as any);
      const cy = scaleY(series.y as any);

      if (cx === undefined || cx === null || cy === undefined || cy === null) continue;

      markerData.push({
        ...series,
        cx: cx as number,
        cy: cy as number
      });
    }

    // Bind data and create/update markers
    const markers = group
      .selectAll<SVGCircleElement, typeof markerData[0]>('circle')
      .data(markerData, d => d.renderer.name);

    // Exit: removed markers
    markers
      .exit()
      .transition()
      .duration(200)
      .ease(d3.easeQuadIn)
      .attr('opacity', 0)
      .attr('r', 0)
      .remove();

    // Enter: new markers
    const enter = markers
      .enter()
      .append('circle')
      .attr('class', 'tooltip-marker')
      .attr('cx', d => d.cx)
      .attr('cy', d => d.cy)
      .attr('r', 0)
      .attr('fill', d => d.color)
      .attr('stroke', 'white')
      .attr('stroke-width', this.props.strokeWidth)
      .attr('opacity', 0);

    // Update: existing markers + newly entered
    markers
      .merge(enter)
      .transition()
      .duration(200)
      .ease(this.props.overshoot ? d3.easeBackOut.overshoot(1.5) : d3.easeQuadOut)
      .attr('cx', d => d.cx)
      .attr('cy', d => d.cy)
      .attr('fill', d => d.color)
      .attr('opacity', 1)
      .attr('r', this.props.radius);
  }

  private hideMarkers(group: D3Group) {
    group
      .selectAll('circle')
      .data([])
      .exit()
      .transition()
      .duration(200)
      .ease(d3.easeQuadIn)
      .attr('opacity', 0)
      .attr('r', 0)
      .remove();
  }

  private getAxes(chart: Hd3Chart): { x?: any[]; y?: any[] } {
    const res: { x?: any[]; y?: any[] } = {};
    this.bus.emit(chart.e<Hd3AxisManagerEvents>()('getAxisManager'), (manager: Hd3AxisManager) => {
      const state = manager.getAxesState();
      res.x = state.x;
      res.y = state.y;
    });
    return res;
  }

  destroy() {
    for (const chart of [...this.chartData.keys()]) {
      this.removeFromChart(chart);
    }
    this.bus.emit(this.e.destroyed, this);
  }
}
