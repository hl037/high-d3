import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3InteractionArea } from './Hd3InteractionArea';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import type { Hd3Series } from '../series/Hd3Series';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import type { RenderableI } from '../interfaces/RenderableI';

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
  interactionArea: Hd3InteractionArea;
  series: Hd3Series[];
  xAxis: Hd3XAxis;
  yAxis: Hd3YAxis;
  showCrossX?: boolean;
  showCrossY?: boolean;
  showAxisLabels?: boolean;
  showMarkers?: boolean;
  crossStyle?: Hd3CursorIndicatorCrossStyle;
  axisLabelStyle?: Hd3CursorIndicatorAxisLabelStyle;
  markerStyle?: Hd3CursorIndicatorMarkerStyle;
}

export class Hd3CursorIndicator implements RenderableI {
  private interactionArea: Hd3InteractionArea;
  private series: Hd3Series[];
  private xAxis: Hd3XAxis;
  private yAxis: Hd3YAxis;
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
  private xLabelGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private yLabelGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
  private interactionBusEndpoint?: Hd3BusEndpoint;

  constructor(options: Hd3CursorIndicatorOptions) {
    this.interactionArea = options.interactionArea;
    this.series = options.series;
    this.xAxis = options.xAxis;
    this.yAxis = options.yAxis;
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

    // Cross lines
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

    // Markers group
    if (this.showMarkers) {
      this.markersGroup = this.group.append('g')
        .attr('class', 'cursor-markers');
    }

    // Axis labels
    if (this.showAxisLabels) {
      this.xLabelGroup = mainGroup.append('g')
        .attr('class', 'cursor-x-label')
        .style('pointer-events', 'none')
        .style('display', 'none');

      this.yLabelGroup = mainGroup.append('g')
        .attr('class', 'cursor-y-label')
        .style('pointer-events', 'none')
        .style('display', 'none');
    }

    // Connect to interaction bus
    this.interactionBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        mousemove: (data: unknown) => this.handleMouseMove(data),
        mouseleave: () => this.handleMouseLeave()
      }
    });
    this.interactionBusEndpoint.bus = this.interactionArea.getBus();
  }

  private handleMouseMove(data: unknown): void {
    if (!this.group || !this.chart) return;

    const mouseData = data as { x: number; y: number };
    
    // Show cursor
    this.group.style('display', null);
    if (this.xLabelGroup) this.xLabelGroup.style('display', null);
    if (this.yLabelGroup) this.yLabelGroup.style('display', null);

    // Update cross lines
    if (this.crossLineX) {
      this.crossLineX
        .attr('x1', mouseData.x)
        .attr('x2', mouseData.x);
    }

    if (this.crossLineY) {
      this.crossLineY
        .attr('y1', mouseData.y)
        .attr('y2', mouseData.y);
    }

    // Convert pixel to data coordinates
    const xScale = this.xAxis.scale as { invert: (x: number) => number };
    const yScale = this.yAxis.scale as { invert: (y: number) => number };
    
    const xValue = xScale.invert(mouseData.x);
    const yValue = yScale.invert(mouseData.y);

    // Update axis labels
    if (this.showAxisLabels) {
      this.updateXLabel(mouseData.x, xValue);
      this.updateYLabel(mouseData.y, yValue);
    }

    // Update markers
    if (this.showMarkers && this.markersGroup) {
      this.updateMarkers(xValue);
    }
  }

  private updateXLabel(x: number, value: number): void {
    if (!this.xLabelGroup || !this.chart) return;

    this.xLabelGroup.selectAll('*').remove();

    const text = value.toFixed(2);
    const tempText = this.xLabelGroup.append('text')
      .text(text)
      .style('font-size', `${this.axisLabelStyle.fontSize}px`)
      .style('visibility', 'hidden');

    const bbox = (tempText.node() as SVGTextElement).getBBox();
    tempText.remove();

    const rectWidth = bbox.width + this.axisLabelStyle.padding * 2;
    const rectHeight = bbox.height + this.axisLabelStyle.padding * 2;
    const rectX = x - rectWidth / 2;
    const rectY = this.chart.innerHeight + 5;

    this.xLabelGroup.append('rect')
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('rx', this.axisLabelStyle.borderRadius)
      .style('fill', this.axisLabelStyle.background);

    this.xLabelGroup.append('text')
      .attr('x', x)
      .attr('y', rectY + bbox.height + this.axisLabelStyle.padding - 2)
      .attr('text-anchor', 'middle')
      .style('fill', this.axisLabelStyle.color)
      .style('font-size', `${this.axisLabelStyle.fontSize}px`)
      .text(text);
  }

  private updateYLabel(y: number, value: number): void {
    if (!this.yLabelGroup || !this.chart) return;

    this.yLabelGroup.selectAll('*').remove();

    const text = value.toFixed(2);
    const tempText = this.yLabelGroup.append('text')
      .text(text)
      .style('font-size', `${this.axisLabelStyle.fontSize}px`)
      .style('visibility', 'hidden');

    const bbox = (tempText.node() as SVGTextElement).getBBox();
    tempText.remove();

    const rectWidth = bbox.width + this.axisLabelStyle.padding * 2;
    const rectHeight = bbox.height + this.axisLabelStyle.padding * 2;
    const rectX = -rectWidth - 5;
    const rectY = y - rectHeight / 2;

    this.yLabelGroup.append('rect')
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('rx', this.axisLabelStyle.borderRadius)
      .style('fill', this.axisLabelStyle.background);

    this.yLabelGroup.append('text')
      .attr('x', rectX + rectWidth / 2)
      .attr('y', y + bbox.height / 2 - 2)
      .attr('text-anchor', 'middle')
      .style('fill', this.axisLabelStyle.color)
      .style('font-size', `${this.axisLabelStyle.fontSize}px`)
      .text(text);
  }

  private updateMarkers(xValue: number): void {
    if (!this.markersGroup) return;

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

          // Get color from series renderer (fallback to default colors)
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
    if (this.group) {
      this.group.style('display', 'none');
    }
    if (this.xLabelGroup) {
      this.xLabelGroup.style('display', 'none');
    }
    if (this.yLabelGroup) {
      this.yLabelGroup.style('display', 'none');
    }
  }

  destroy(): void {
    this.interactionBusEndpoint?.destroy();
    if (this.group) {
      this.group.remove();
    }
    if (this.xLabelGroup) {
      this.xLabelGroup.remove();
    }
    if (this.yLabelGroup) {
      this.yLabelGroup.remove();
    }
  }
}
