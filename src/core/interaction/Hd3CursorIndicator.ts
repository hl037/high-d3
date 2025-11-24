import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3Axis } from '../axis/Hd3Axis';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3AxisManager, Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';
import { Hd3InteractionArea, Hd3InteractionAreaManagerEvents, Hd3InteractionAreaChartEvents, MouseEventData } from './Hd3InteractionArea';
import { emitDirty, Hd3RenderableI } from '../managers/Hd3RenderManager';
import { MergingDict, mergingDictAttr } from '../utils/MergingDict';

export interface Hd3CursorIndicatorCrossStyle {
  strokeX: string;
  strokeY: string;
  strokeWidth: number;
  strokeDasharray: string;
  opacity: number;
}

export interface Hd3CursorIndicatorCrossOptions{
  showCrossX: boolean;
  showCrossY: boolean;
  showAxisLabels: boolean;
  crossStyle: Hd3CursorIndicatorCrossStyle;
  axisLabelStyle: Hd3CursorIndicatorAxisLabelStyle;
}

export interface Hd3CursorIndicatorAxisLabelStyle {
  background: string;
  color: string;
  fontSize: number;
  padding: number;
  borderRadius: number;
}

export interface Hd3CursorIndicatorEvents {
  destroyed: Hd3CursorIndicator;
}

export interface Hd3CursorIndicatorOptions {
  bus?: Hd3Bus;
  axes?: (Hd3Axis | string)[];
  props?: Partial<Hd3CursorIndicatorCrossOptions>;
}

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

interface ChartData {
  group: D3Group;
  crossLineX: d3.Selection<SVGLineElement, unknown, null, undefined>;
  crossLineY: d3.Selection<SVGLineElement, unknown, null, undefined>;
  labelsGroup: D3Group;
  interactionArea?: Hd3InteractionArea;
  handleMouseMove: (data: MouseEventData) => void;
  handleMouseLeave: () => void;
  handleResize: () => void;
  handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => void
}

export class Hd3CursorIndicator implements Hd3RenderableI<Hd3Chart> {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3CursorIndicatorEvents>;
  private chartData: Map<Hd3Chart, ChartData>;
  private axes?: (Hd3Axis | string)[];
  public get props(): MergingDict<Hd3CursorIndicatorCrossOptions>{throw "init threw mergingDictAttr"};
  public set props(_:Hd3CursorIndicatorCrossOptions){throw "init threw mergingDictAttr"};
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
    mergingDictAttr(
      this,
      'props',
      {
        showCrossX: true,
        showCrossY: true,
        showAxisLabels: true,
        crossStyle:{
          strokeX: '#666',
          strokeY: '#666',
          strokeWidth: 1,
          strokeDasharray: '4,4',
          opacity: 0.7,
        },
        axisLabelStyle:{
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#fff',
          fontSize: 11,
          padding: 4,
          borderRadius: 3,
        }
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
      destroyed: createHd3Event<Hd3CursorIndicator>('cursorIndicator.destroyed'),
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
      handleInteractionAreaChanged: (interactionArea: Hd3InteractionArea) => {
        if(chartData.interactionArea !== undefined) {
          this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('mousemove'), chartData.handleMouseMove);
          this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('mouseleave'), chartData.handleMouseLeave);
        }
        chartData.interactionArea = interactionArea;
        if(chartData.interactionArea !== undefined) {
          this.bus.on(chart.e<Hd3InteractionAreaChartEvents>()('mousemove'), chartData.handleMouseMove);
          this.bus.on(chart.e<Hd3InteractionAreaChartEvents>()('mouseleave'), chartData.handleMouseLeave);
        }
      },

    // Cross lines
      crossLineX: group.append('line')
        .attr('class', 'cursor-cross-x'),

      crossLineY: group.append('line')
        .attr('class', 'cursor-cross-y'),

      // Labels group
      labelsGroup: chart.layer.overlay.append('g')
        .attr('class', 'cursor-labels')
        .style('pointer-events', 'none')
        .style('display', (this.props.showAxisLabels ? 'unset': 'none')!),
    };
      


    this.chartData.set(chart, chartData);

    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.on(chart.e.resized, chartData.handleResize);

    // Subscribe to interaction area events
    this.bus.emit(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), chartData.handleInteractionAreaChanged);
    this.bus.on(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), chartData.handleInteractionAreaChanged);
    this.tagDirty(chart);
  }


  public removeFromChart(chart: Hd3Chart) {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    this.bus.off(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), chartData.handleInteractionAreaChanged);
    chartData.group.remove();
    chartData.labelsGroup?.remove();

    this.bus.off(chart.e.destroyed, this.removeFromChart);
    this.bus.off(chart.e.resized, chartData.handleResize);

    this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('mousemove'), chartData.handleMouseMove);
    this.bus.off(chart.e<Hd3InteractionAreaChartEvents>()('mouseleave'), chartData.handleMouseLeave);

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
      chartData.labelsGroup?.style('display', 'none');
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
    const { x: xAxes, y: yAxes } = this.getAxes(chart);
    const mappedCoords = mouseData.mappedCoords || {};

    // Find common axes
    const commonXAxes = (xAxes || []).filter(axis => axis.name in mappedCoords);
    const commonYAxes = (yAxes || []).filter(axis => axis.name in mappedCoords);

    // If no common axes, hide everything
    if (commonXAxes.length === 0 && commonYAxes.length === 0) {
      chartData.group.style('display', 'none');
      chartData.labelsGroup?.style('display', 'none');
      return;
    }

    chartData.group.style('display', null);
    chartData.labelsGroup?.style('display', null);

    // Cross lines use first common axis
    const firstXAxis = commonXAxes[0];
    const firstYAxis = commonYAxes[0];

    // Vertical line (X axis)
    if (firstXAxis && this.props.showCrossX) {
      const scale = firstXAxis.getScale(chart);
      const xValue = mappedCoords[firstXAxis.name]!;
      const finalX = scale!(xValue)!;
      chartData.crossLineX
        .style('display', null)
        .attr('y1', 0)
        .attr('y2', chart.innerHeight)
        .attr('x1', finalX)
        .attr('x2', finalX)
        .style('stroke', this.props.crossStyle.strokeX)
        .style('stroke-width', this.props.crossStyle.strokeWidth)
        .style('stroke-dasharray', this.props.crossStyle.strokeDasharray)
        .style('opacity', this.props.crossStyle.opacity)
        .style('display', (this.props.showCrossX ? null: 'none')!);
    } else {
      chartData.crossLineX.style('display', 'none');
    }

    // Horizontal line (Y axis)
    if (firstYAxis && this.props.showCrossY) {
      const scale = firstYAxis.getScale(chart);
      const yValue = mappedCoords[firstYAxis.name]!;
      const finalY = scale!(yValue)!;
      chartData.crossLineY
        .style('display', null)
        .attr('y1', finalY)
        .attr('y2', finalY)
        .attr('x1', 0)
        .attr('x2', chart.innerWidth)
        .style('stroke', this.props.crossStyle.strokeY)
        .style('stroke-width', this.props.crossStyle.strokeWidth)
        .style('stroke-dasharray', this.props.crossStyle.strokeDasharray)
        .style('opacity', this.props.crossStyle.opacity)
        .style('display', (this.props.showCrossY ? 'unset': 'none')!);
    } else {
      chartData.crossLineY.style('display', 'none');
    }

    // Labels
    chartData.labelsGroup.selectAll('*').remove();

    if(this.props.showAxisLabels) {
      // X axis labels (one per axis)
      for (const axis of commonXAxes) {
        const scale = axis.getScale(chart);
        if (!scale) continue;

        const value = mappedCoords[axis.name]!;
        const finalX = scale(value)!;
        const translation = axis.getTranslation(chart);

        this.createXLabel(chartData.labelsGroup, finalX, translation.y, value);
      }

      // Y axis label (aggregated)
      if (commonYAxes.length > 0) {
        const yData = commonYAxes.map(axis => {
          const scale = axis.getScale(chart);
          const value = mappedCoords[axis.name]!;
          return {
            name: axis.name,
            value,
            y: scale ? scale(value)! : 0,
          };
        })!;

        // Position at the first Y axis and use average Y position
        const firstAxis = commonYAxes[0];
        const translation = firstAxis.getTranslation(chart);
        const avgY = (yData.reduce((sum, d) => sum + d.y, 0) / yData.length)!;

        this.createAggregatedYLabel(
          chartData.labelsGroup,
          translation.x,
          avgY,
          yData,
          firstAxis.position
        );
      }
    }
  }

  private formatAxisValue(value:number|string|Date){
    if(typeof value === 'number') {
      return value.toFixed(2) ;
    }
    if(value instanceof Date) {
      return value.toLocaleString()
    }
    return value;
  }

  private createXLabel(parent: D3Group, x: number, y: number, value: number|string|Date) {
    const text = this.formatAxisValue(value);
      

    const labelGroup = parent.append('g')
      .attr('class', 'cursor-x-label');

    const tempText = labelGroup.append('text')
      .text(text)
      .style('font-size', `${this.props.axisLabelStyle.fontSize}px`)
      .style('visibility', 'hidden');

    const bbox = (tempText.node() as SVGTextElement).getBBox();
    tempText.remove();

    const rectWidth = bbox.width + this.props.axisLabelStyle.padding * 2;
    const rectHeight = bbox.height + this.props.axisLabelStyle.padding * 2;
    const rectX = x - rectWidth / 2;
    const rectY = y + 5;

    labelGroup.append('rect')
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('rx', this.props.axisLabelStyle.borderRadius)
      .style('fill', this.props.axisLabelStyle.background);

    labelGroup.append('text')
      .attr('x', x)
      .attr('y', rectY + bbox.height + this.props.axisLabelStyle.padding - 2)
      .attr('text-anchor', 'middle')
      .style('fill', this.props.axisLabelStyle.color)
      .style('font-size', `${this.props.axisLabelStyle.fontSize}px`)
      .text(text);
  }

  private createAggregatedYLabel(
    parent: D3Group,
    x: number,
    y: number,
    data: { name: string; value: number | string | Date }[],
    position: 'left' | 'right' | 'top' | 'bottom'
  ) {
    const labelGroup = parent.append('g')
      .attr('class', 'cursor-y-label');

    const lineHeight = this.props.axisLabelStyle.fontSize + 2;
    const lines = data.map(d => `${d.name}: ${this.formatAxisValue(d.value)}`);

    // Measure text width
    let maxWidth = 0;
    for (const line of lines) {
      const tempText = labelGroup.append('text')
        .text(line)
        .style('font-size', `${this.props.axisLabelStyle.fontSize}px`)
        .style('visibility', 'hidden');
      const bbox = (tempText.node() as SVGTextElement).getBBox();
      maxWidth = Math.max(maxWidth, bbox.width);
      tempText.remove();
    }

    const rectWidth = maxWidth + this.props.axisLabelStyle.padding * 2;
    const rectHeight = lineHeight * lines.length + this.props.axisLabelStyle.padding * 2;

    const isLeft = position === 'left';
    const rectX = isLeft ? x - rectWidth - 5 : x + 5;
    const rectY = y - rectHeight / 2;

    labelGroup.append('rect')
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('rx', this.props.axisLabelStyle.borderRadius)
      .style('fill', this.props.axisLabelStyle.background);

    lines.forEach((line, i) => {
      labelGroup.append('text')
        .attr('x', rectX + this.props.axisLabelStyle.padding)
        .attr('y', rectY + this.props.axisLabelStyle.padding + lineHeight * (i + 1) - 2)
        .attr('text-anchor', 'start')
        .style('fill', this.props.axisLabelStyle.color)
        .style('font-size', `${this.props.axisLabelStyle.fontSize}px`)
        .text(line);
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
