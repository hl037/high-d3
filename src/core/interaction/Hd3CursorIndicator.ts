import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3Series } from '../series/Hd3Series';
import type { Hd3Axis } from '../axis/Hd3Axis';
import type { Hd3AxisDomain } from '../axis/Hd3AxisDomain';
import type { Hd3Bus } from '../bus/Hd3Bus';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import type { RenderableI } from '../interfaces/RenderableI';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';
import type { DomainEventData } from './Hd3InteractionArea';

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

export interface Hd3CursorIndicatorOptions {
  series: Hd3Series[];
  axes?: (Hd3Axis | string)[];
  buses?: Hd3Bus[];
  showCrossX?: boolean;
  showCrossY?: boolean;
  showAxisLabels?: boolean;
  showMarkers?: boolean;
  crossStyle?: Hd3CursorIndicatorCrossStyle;
  axisLabelStyle?: Hd3CursorIndicatorAxisLabelStyle;
  markerStyle?: Hd3CursorIndicatorMarkerStyle;
}

export class Hd3CursorIndicator implements RenderableI {
  private series: Hd3Series[];
  private axesDiscovery: Hd3AxesDiscovery;
  private showCrossX: boolean;
  private showCrossY: boolean;
  private showAxisLabels: boolean;
  private showMarkers: boolean;
  private crossStyle: Required<Hd3CursorIndicatorCrossStyle>;
  private axisLabelStyle: Required<Hd3CursorIndicatorAxisLabelStyle>;
  private markerStyle: Required<Hd3CursorIndicatorMarkerStyle>;
  private chart?: Hd3Chart;
  private group?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private crossLineX?: d3.Selection<SVGLineElement, unknown, null, undefined>;
  private crossLineY?: d3.Selection<SVGLineElement, unknown, null, undefined>;
  private markersGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private xLabelGroups: Map<Hd3Axis, d3.Selection<SVGGElement, unknown, null, undefined>> = new Map();
  private yLabelGroups: Map<Hd3Axis, d3.Selection<SVGGElement, unknown, null, undefined>> = new Map();
  private domainBusEndpoints: Map<Hd3AxisDomain, Hd3BusEndpoint> = new Map();
  private xAxis?: Hd3Axis;
  private yAxis?: Hd3Axis;
  private allXAxes: Hd3Axis[] = [];
  private allYAxes: Hd3Axis[] = [];

  constructor(options: Hd3CursorIndicatorOptions) {
    this.series = options.series;
    this.axesDiscovery = new Hd3AxesDiscovery(options.axes || [], options.buses || []);
    this.showCrossX = options.showCrossX ?? true;
    this.showCrossY = options.showCrossY ?? true;
    this.showAxisLabels = options.showAxisLabels ?? true;
    this.showMarkers = options.showMarkers ?? true;
    
    this.crossStyle = {
      strokeX: '#666',
      strokeY: '#666',
      strokeWidth: 1,
      strokeDasharray: '4,4',
      opacity: 0.7,
      ...options.crossStyle
    };

    this.axisLabelStyle = {
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      fontSize: 11,
      padding: 4,
      borderRadius: 3,
      ...options.axisLabelStyle
    };

    this.markerStyle = {
      radius: 4,
      stroke: '#fff',
      strokeWidth: 2,
      fillOpacity: 1,
      ...options.markerStyle
    };

    this.findAxes();
  }

  private findAxes(): void {
    const axes = this.axesDiscovery.getAxes();
    this.allXAxes = axes.filter(a => a.getOrientation() === 'x');
    this.allYAxes = axes.filter(a => a.getOrientation() === 'y');
    
    // Use first X and Y axes for cross lines
    this.xAxis = this.allXAxes[0];
    this.yAxis = this.allYAxes[0];
  }

  render(chart: Hd3Chart): void {
    this.chart = chart;
    const mainGroup = chart.getMainGroup();

    if (this.group) {
      this.group.remove();
    }

    this.group = mainGroup.append('g')
      .attr('class', 'cursor-indicator')
      .style('pointer-events', 'none')
      .style('display', 'none');

    if (this.showCrossX) {
      this.crossLineX = this.group.append('line')
        .attr('class', 'cursor-cross-x')
        .attr('y1', 0)
        .attr('y2', chart.innerHeight)
        .style('stroke', this.crossStyle.strokeX)
        .style('stroke-width', this.crossStyle.strokeWidth)
        .style('stroke-dasharray', this.crossStyle.strokeDasharray)
        .style('opacity', this.crossStyle.opacity);
    }

    if (this.showCrossY) {
      this.crossLineY = this.group.append('line')
        .attr('class', 'cursor-cross-y')
        .attr('x1', 0)
        .attr('x2', chart.innerWidth)
        .style('stroke', this.crossStyle.strokeY)
        .style('stroke-width', this.crossStyle.strokeWidth)
        .style('stroke-dasharray', this.crossStyle.strokeDasharray)
        .style('opacity', this.crossStyle.opacity);
    }

    if (this.showMarkers) {
      this.markersGroup = this.group.append('g')
        .attr('class', 'cursor-markers');
    }

    if (this.showAxisLabels) {
      // Create label groups for each X axis
      for (const xAxis of this.allXAxes) {
        const labelGroup = mainGroup.append('g')
          .attr('class', `cursor-x-label cursor-x-label-${xAxis.name}`)
          .style('pointer-events', 'none')
          .style('display', 'none');
        this.xLabelGroups.set(xAxis, labelGroup);
      }

      // Create label groups for each Y axis
      for (const yAxis of this.allYAxes) {
        const labelGroup = mainGroup.append('g')
          .attr('class', `cursor-y-label cursor-y-label-${yAxis.name}`)
          .style('pointer-events', 'none')
          .style('display', 'none');
        this.yLabelGroups.set(yAxis, labelGroup);
      }
    }

    this.setupAxisListeners();
  }

  private setupAxisListeners(): void {
    // Listen to all X axis domains
    for (const xAxis of this.allXAxes) {
      const axisDomain = xAxis.getAxisDomain();
      const endpoint = new Hd3BusEndpoint({
        listeners: {
          mousemove: (data: unknown) => this.handleMouseMove(data, 'x'),
          mouseleave: () => this.handleMouseLeave()
        }
      });
      endpoint.bus = axisDomain.getBus();
      this.domainBusEndpoints.set(axisDomain, endpoint);
    }
    
    // Listen to all Y axis domains
    for (const yAxis of this.allYAxes) {
      const axisDomain = yAxis.getAxisDomain();
      const endpoint = new Hd3BusEndpoint({
        listeners: {
          mousemove: (data: unknown) => this.handleMouseMove(data, 'y'),
          mouseleave: () => this.handleMouseLeave()
        }
      });
      endpoint.bus = axisDomain.getBus();
      this.domainBusEndpoints.set(axisDomain, endpoint);
    }
  }

  private lastXValue?: number;
  private lastYValue?: number;
  private lastViewportX?: number;
  private lastViewportY?: number;

  private handleMouseMove(data: unknown, source: 'x' | 'y'): void {
    if (!this.group || !this.chart || !this.xAxis || !this.yAxis) return;

    const eventData = data as DomainEventData;
    
    // Update the value for the source axis
    if (source === 'x') {
      this.lastXValue = eventData.value as number;
      this.lastViewportY = eventData.viewportY;
    } else {
      this.lastYValue = eventData.value as number;
      this.lastViewportX = eventData.viewportX;
    }
    
    // We need both X and Y to be set
    if (this.lastXValue === undefined || this.lastYValue === undefined) {
      return;
    }
    
    // Convert domain values to viewport positions using our own scales
    const xScale = this.xAxis.scale as (x: number) => number;
    const yScale = this.yAxis.scale as (y: number) => number;
    
    const viewportX = xScale(this.lastXValue);
    const viewportY = yScale(this.lastYValue);
    
    this.group.style('display', null);
    for (const labelGroup of this.xLabelGroups.values()) {
      labelGroup.style('display', null);
    }
    for (const labelGroup of this.yLabelGroups.values()) {
      labelGroup.style('display', null);
    }

    if (this.crossLineX) {
      this.crossLineX
        .attr('x1', viewportX)
        .attr('x2', viewportX);
    }

    if (this.crossLineY) {
      this.crossLineY
        .attr('y1', viewportY)
        .attr('y2', viewportY);
    }

    if (this.showAxisLabels) {
      // Update X labels for all X axes using each axis's own scale
      for (const xAxis of this.allXAxes) {
        const labelGroup = this.xLabelGroups.get(xAxis);
        if (labelGroup) {
          const scale = xAxis.scale as (x: number) => number;
          const axisViewportX = scale(this.lastXValue);
          this.updateXLabel(labelGroup, axisViewportX, this.lastXValue);
        }
      }
      
      // Update Y labels for all Y axes using each axis's own scale
      for (const yAxis of this.allYAxes) {
        const labelGroup = this.yLabelGroups.get(yAxis);
        if (labelGroup) {
          const scale = yAxis.scale as (y: number) => number;
          const axisViewportY = scale(this.lastYValue);
          this.updateYLabel(labelGroup, axisViewportY, this.lastYValue);
        }
      }
    }

    if (this.showMarkers && this.markersGroup) {
      this.updateMarkers(this.lastXValue);
    }
  }

  private updateXLabel(
    labelGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    x: number,
    value: number
  ): void {
    if (!this.chart) return;

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
    const rectY = this.chart.innerHeight + 5;

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

  private updateYLabel(
    labelGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    y: number,
    value: number
  ): void {
    if (!this.chart) return;

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

  private updateMarkers(xValue: number): void {
    if (!this.markersGroup || !this.xAxis || !this.yAxis) return;

    this.markersGroup.selectAll('*').remove();

    const xScale = this.xAxis.scale as (x: number) => number;
    const yScale = this.yAxis.scale as (y: number) => number;

    this.series
      .filter(s => s.visible)
      .forEach((series, idx) => {
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
          const px = xScale(typeof closest[0] === 'number' ? closest[0] : 0);
          const py = yScale(closest[1]);

          const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#16a085', '#e67e22'];
          const color = colors[idx % colors.length];

          this.markersGroup!.append('circle')
            .attr('cx', px)
            .attr('cy', py)
            .attr('r', this.markerStyle.radius)
            .style('fill', color)
            .style('fill-opacity', this.markerStyle.fillOpacity)
            .style('stroke', this.markerStyle.stroke)
            .style('stroke-width', this.markerStyle.strokeWidth);
        }
      });
  }

  private handleMouseLeave(): void {
    this.lastXValue = undefined;
    this.lastYValue = undefined;
    this.lastViewportX = undefined;
    this.lastViewportY = undefined;
    
    if (this.group) {
      this.group.style('display', 'none');
    }
    for (const labelGroup of this.xLabelGroups.values()) {
      labelGroup.style('display', 'none');
    }
    for (const labelGroup of this.yLabelGroups.values()) {
      labelGroup.style('display', 'none');
    }
  }

  destroy(): void {
    for (const endpoint of this.domainBusEndpoints.values()) {
      endpoint.destroy();
    }
    this.domainBusEndpoints.clear();
    if (this.group) {
      this.group.remove();
    }
    for (const labelGroup of this.xLabelGroups.values()) {
      labelGroup.remove();
    }
    for (const labelGroup of this.yLabelGroups.values()) {
      labelGroup.remove();
    }
    this.xLabelGroups.clear();
    this.yLabelGroups.clear();
    this.axesDiscovery.destroy();
  }
}
