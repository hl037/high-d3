import * as d3 from 'd3';
import type { Hd3Chart, Hd3ChartI } from '../chart/Hd3Chart';
import type { Hd3Axis } from '../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';
import { Hd3InteractionAreaManagerEvents, MouseEventData } from './Hd3InteractionArea';
import { Hd3SeriesRendererManager, Hd3SeriesRendererManagerEvents } from '../managers/Hd3SeriesRenderManager';
import { emitDirty, Hd3RenderableI } from '../managers/Hd3RenderManager';

export interface Hd3CursorIndicatorCrossStyle {
  strokeX?: string;
  strokeY?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
}

export interface Hd3CursorIndicatorAxisLabelStyle {
  background?: string;
  color?: string;
  fontSize?: number;
  padding?: number;
  borderRadius?: number;
}

export interface Hd3CursorIndicatorMarkerStyle {
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
  fillOpacity?: number;
}

export interface Hd3CursorIndicatorEvents {
  destroyed: Hd3CursorIndicator;
}

export interface Hd3CursorIndicatorOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
  showCrossX?: boolean;
  showCrossY?: boolean;
  showAxisLabels?: boolean;
  showMarkers?: boolean;
  crossStyle?: Hd3CursorIndicatorCrossStyle;
  axisLabelStyle?: Hd3CursorIndicatorAxisLabelStyle;
  markerStyle?: Hd3CursorIndicatorMarkerStyle;
}

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

interface ChartData {
  group: D3Group;
  crossLineX?: d3.Selection<SVGLineElement, unknown, null, undefined>;
  crossLineY?: d3.Selection<SVGLineElement, unknown, null, undefined>;
  markersGroup?: D3Group;
  xLabelGroup?: D3Group;
  yLabelGroup?: D3Group;
  handleMouseMove: (data: MouseEventData) => void;
  handleMouseLeave: () => void;
  handleResize: () => void;
}

export class Hd3CursorIndicator implements Hd3RenderableI<Hd3Chart> {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3CursorIndicatorEvents>;
  private chartData: Map<Hd3Chart, ChartData>;
  private axes?: (Hd3Axis | string)[];
  private showCrossX: boolean;
  private showCrossY: boolean;
  private showAxisLabels: boolean;
  private showMarkers: boolean;
  private crossStyle: Required<Hd3CursorIndicatorCrossStyle>;
  private axisLabelStyle: Required<Hd3CursorIndicatorAxisLabelStyle>;
  private markerStyle: Required<Hd3CursorIndicatorMarkerStyle>;
  private lastMouseData?: MouseEventData;
  private isVisible: boolean = false;

  constructor(options: Hd3CursorIndicatorOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handleMouseMoveGlobal = this.handleMouseMoveGlobal.bind(this);
    this.handleMouseLeaveGlobal = this.handleMouseLeaveGlobal.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.axes = options.axes;
    this.showCrossX = options.showCrossX ?? true;
    this.showCrossY = options.showCrossY ?? true;
    this.showAxisLabels = options.showAxisLabels ?? true;
    this.showMarkers = options.showMarkers ?? true;

    this.e = {
      destroyed: createHd3Event<Hd3CursorIndicator>('cursorIndicator.destroyed'),
    };

    this.crossStyle = {
      strokeX: '#666',
      strokeY: '#666',
      strokeWidth: 1,
      strokeDasharray: '4,4',
      opacity: 0.7,
      ...options.crossStyle,
    };

    this.axisLabelStyle = {
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      fontSize: 11,
      padding: 4,
      borderRadius: 3,
      ...options.axisLabelStyle,
    };

    this.markerStyle = {
      radius: 4,
      stroke: '#fff',
      strokeWidth: 2,
      fillOpacity: 1,
      ...options.markerStyle,
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    const group = chart.layer.overlay.append('g')
      .attr('class', 'cursor-indicator')
      .style('pointer-events', 'none')
      .style('display', 'none');

    const chartData: ChartData = {
      group,
      handleMouseMove: this.handleMouseMoveGlobal,
      handleMouseLeave: this.handleMouseLeaveGlobal,
      handleResize: () => this.handleResize(chart),
    };

    // Cross lines
    if (this.showCrossX) {
      chartData.crossLineX = group.append('line')
        .attr('class', 'cursor-cross-x')
        .attr('y1', 0)
        .attr('y2', chart.innerHeight)
        .style('stroke', this.crossStyle.strokeX)
        .style('stroke-width', this.crossStyle.strokeWidth)
        .style('stroke-dasharray', this.crossStyle.strokeDasharray)
        .style('opacity', this.crossStyle.opacity);
    }

    if (this.showCrossY) {
      chartData.crossLineY = group.append('line')
        .attr('class', 'cursor-cross-y')
        .attr('x1', 0)
        .attr('x2', chart.innerWidth)
        .style('stroke', this.crossStyle.strokeY)
        .style('stroke-width', this.crossStyle.strokeWidth)
        .style('stroke-dasharray', this.crossStyle.strokeDasharray)
        .style('opacity', this.crossStyle.opacity);
    }

    // Markers group
    if (this.showMarkers) {
      chartData.markersGroup = group.append('g')
        .attr('class', 'cursor-markers');
    }

    // Axis labels
    if (this.showAxisLabels) {
      chartData.xLabelGroup = chart.layer.overlay.append('g')
        .attr('class', 'cursor-x-label')
        .style('pointer-events', 'none')
        .style('display', 'none');

      chartData.yLabelGroup = chart.layer.overlay.append('g')
        .attr('class', 'cursor-y-label')
        .style('pointer-events', 'none')
        .style('display', 'none');
    }

    this.chartData.set(chart, chartData);

    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.on(chart.e.resized, chartData.handleResize);

    // Subscribe to interaction area events
    this.bus.emit(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), (interactionArea) => {
      this.bus.on(interactionArea.e.mousemove, chartData.handleMouseMove);
      this.bus.on(interactionArea.e.mouseleave, chartData.handleMouseLeave);
    });
  }

  public removeFromChart(chart: Hd3Chart) {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    chartData.group.remove();
    chartData.xLabelGroup?.remove();
    chartData.yLabelGroup?.remove();

    this.bus.off(chart.e.destroyed, this.removeFromChart);
    this.bus.off(chart.e.resized, chartData.handleResize);

    this.bus.emit(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), (interactionArea) => {
      this.bus.off(interactionArea.e.mousemove, chartData.handleMouseMove);
      this.bus.off(interactionArea.e.mouseleave, chartData.handleMouseLeave);
    });

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

    if (!this.isVisible || !this.lastMouseData) {
      chartData.group.style('display', 'none');
      chartData.xLabelGroup?.style('display', 'none');
      chartData.yLabelGroup?.style('display', 'none');
      return;
    }

    this.renderChart(chart, chartData, this.lastMouseData);
  }

  private handleResize(chart: Hd3Chart) {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    if (chartData.crossLineX) {
      chartData.crossLineX.attr('y2', chart.innerHeight);
    }
    if (chartData.crossLineY) {
      chartData.crossLineY.attr('x2', chart.innerWidth);
    }
    this.tagDirty(chart);
  }

  private handleMouseMoveGlobal(mouseData: MouseEventData) {
    this.lastMouseData = mouseData;
    this.isVisible = true;
    this.tagDirty();
  }

  private handleMouseLeaveGlobal() {
    this.isVisible = false;
    this.tagDirty();
  }

  private renderChart(chart: Hd3Chart, chartData: ChartData, mouseData: MouseEventData) {
    const { x, y } = this.getAxes(chart);
    const scaleX = x?.getScale(chart);
    const scaleY = y?.getScale(chart);

    const mappedCoords = mouseData.mappedCoords || {};

    // Check if axes are common (present in mappedCoords)
    const xAxisName = x?.name;
    const yAxisName = y?.name;
    const hasCommonX = xAxisName !== undefined && xAxisName in mappedCoords;
    const hasCommonY = yAxisName !== undefined && yAxisName in mappedCoords;

    // If no common axes, hide everything for this chart
    if (!hasCommonX && !hasCommonY) {
      chartData.group.style('display', 'none');
      chartData.xLabelGroup?.style('display', 'none');
      chartData.yLabelGroup?.style('display', 'none');
      return;
    }

    // Show cursor
    chartData.group.style('display', null);

    let xValue: number | undefined;
    let yValue: number | undefined;
    let finalX: number | undefined;
    let finalY: number | undefined;

    // X axis (vertical line)
    if (hasCommonX && scaleX) {
      xValue = mappedCoords[xAxisName!];
      finalX = scaleX(xValue)!;

      if (chartData.crossLineX) {
        chartData.crossLineX
          .style('display', null)
          .attr('x1', finalX)
          .attr('x2', finalX);
      }

      if (chartData.xLabelGroup) {
        chartData.xLabelGroup.style('display', null);
        this.updateXLabel(chart, chartData.xLabelGroup, finalX, xValue);
      }
    } else {
      chartData.crossLineX?.style('display', 'none');
      chartData.xLabelGroup?.style('display', 'none');
    }

    // Y axis (horizontal line)
    if (hasCommonY && scaleY) {
      yValue = mappedCoords[yAxisName!];
      finalY = scaleY(yValue)!;

      if (chartData.crossLineY) {
        chartData.crossLineY
          .style('display', null)
          .attr('y1', finalY)
          .attr('y2', finalY);
      }

      if (chartData.yLabelGroup) {
        chartData.yLabelGroup.style('display', null);
        this.updateYLabel(chartData.yLabelGroup, finalY, yValue);
      }
    } else {
      chartData.crossLineY?.style('display', 'none');
      chartData.yLabelGroup?.style('display', 'none');
    }

    // Update markers (need both X common and Y scale available)
    if (this.showMarkers && chartData.markersGroup && hasCommonX && scaleX && scaleY && xValue !== undefined) {
      this.updateMarkers(chart, chartData.markersGroup, scaleX, scaleY, xValue);
    } else {
      chartData.markersGroup?.selectAll('*').remove();
    }
  }

  private updateXLabel(chart: Hd3Chart, labelGroup: D3Group, x: number, value: number) {
    labelGroup.selectAll('*').remove();

    const text = value.toFixed(2);
    const tempText = labelGroup.append('text')
      .text(text)
      .style('font-size', `${this.axisLabelStyle.fontSize}px`)
      .style('visibility', 'hidden');

    const bbox = (tempText.node() as SVGTextElement).getBBox();
    tempText.remove();

    const rectWidth = bbox.width + this.axisLabelStyle.padding * 2;
    const rectHeight = bbox.height + this.axisLabelStyle.padding * 2;
    const rectX = x - rectWidth / 2;
    const rectY = chart.innerHeight + 5;

    labelGroup.append('rect')
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('rx', this.axisLabelStyle.borderRadius)
      .style('fill', this.axisLabelStyle.background);

    labelGroup.append('text')
      .attr('x', x)
      .attr('y', rectY + bbox.height + this.axisLabelStyle.padding - 2)
      .attr('text-anchor', 'middle')
      .style('fill', this.axisLabelStyle.color)
      .style('font-size', `${this.axisLabelStyle.fontSize}px`)
      .text(text);
  }

  private updateYLabel(labelGroup: D3Group, y: number, value: number) {
    labelGroup.selectAll('*').remove();

    const text = value.toFixed(2);
    const tempText = labelGroup.append('text')
      .text(text)
      .style('font-size', `${this.axisLabelStyle.fontSize}px`)
      .style('visibility', 'hidden');

    const bbox = (tempText.node() as SVGTextElement).getBBox();
    tempText.remove();

    const rectWidth = bbox.width + this.axisLabelStyle.padding * 2;
    const rectHeight = bbox.height + this.axisLabelStyle.padding * 2;
    const rectX = -rectWidth - 5;
    const rectY = y - rectHeight / 2;

    labelGroup.append('rect')
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('rx', this.axisLabelStyle.borderRadius)
      .style('fill', this.axisLabelStyle.background);

    labelGroup.append('text')
      .attr('x', rectX + rectWidth / 2)
      .attr('y', y + bbox.height / 2 - 2)
      .attr('text-anchor', 'middle')
      .style('fill', this.axisLabelStyle.color)
      .style('font-size', `${this.axisLabelStyle.fontSize}px`)
      .text(text);
  }

  private updateMarkers(
    chart: Hd3Chart,
    markersGroup: D3Group,
    scaleX: d3.ScaleContinuousNumeric<number, number>,
    scaleY: d3.ScaleContinuousNumeric<number, number>,
    xValue: number
  ) {
    markersGroup.selectAll('*').remove();

    this.bus.emit(chart.e<Hd3SeriesRendererManagerEvents>()('getSeriesRendererManager'), (manager: Hd3SeriesRendererManager) => {
      const renderers = manager.getSeries();

      renderers
        .filter(r => r.visible)
        .forEach((renderer) => {
          const series = (renderer as any).series;
          if (!series) return;

          const data = series.data;
          let closest = data[0];
          let minDist = Infinity;

          for (const point of data) {
            const px = typeof point[0] === 'number' ? point[0] : 0;
            const dist = Math.abs(px - xValue);
            if (dist < minDist) {
              minDist = dist;
              closest = point;
            }
          }

          if (closest) {
            const px = scaleX(typeof closest[0] === 'number' ? closest[0] : 0)!;
            const py = scaleY(closest[1])!;
            const color = (renderer as any).color;

            markersGroup.append('circle')
              .attr('cx', px)
              .attr('cy', py)
              .attr('r', this.markerStyle.radius)
              .style('fill', color)
              .style('fill-opacity', this.markerStyle.fillOpacity)
              .style('stroke', this.markerStyle.stroke)
              .style('stroke-width', this.markerStyle.strokeWidth);
          }
        });
    });
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

  destroy() {
    for (const chart of this.chartData.keys()) {
      this.removeFromChart(chart);
    }
    this.bus.emit(this.e.destroyed, this);
  }
}
