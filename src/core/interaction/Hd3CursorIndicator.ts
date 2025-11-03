import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3InteractionArea } from './Hd3InteractionArea';
import type { Hd3Axis } from '../axis/Hd3Axis';
import type { Hd3Bus } from '../bus/Hd3Bus';
import type { Hd3Series } from '../series/Hd3Series';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import type { RenderableI } from '../interfaces/RenderableI';
import { Hd3AxesDiscovery } from '../axis/Hd3AxesDiscovery';

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
  interactionArea?: Hd3InteractionArea;
  series: Hd3Series[];
  xAxis?: any;
  yAxis?: any;
  axes?: (Hd3Axis | string)[];
  charts?: Hd3Bus[];
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
  private xAxis?: any;
  private yAxis?: any;
  private axisDiscovery?: Hd3AxesDiscovery;
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
  private chartBusEndpoint?: Hd3BusEndpoint;

  constructor(options: Hd3CursorIndicatorOptions) {
    this.series = options.series;
    this.xAxis = options.xAxis;
    this.yAxis = options.yAxis;
    this.showCrossX = options.showCrossX ?? true;
    this.showCrossY = options.showCrossY ?? true;
    this.showAxisLabels = options.showAxisLabels ?? true;
    this.showMarkers = options.showMarkers ?? true;
    
    // Create axis discovery
    if (options.axes !== undefined || options.charts !== undefined) {
      const charts = options.charts || [];
      this.axisDiscovery = new Hd3AxesDiscovery(options.axes, charts);
      
      // Find X and Y axes from discovery
      const axes = this.axisDiscovery.getAxes();
      for (const axis of axes) {
        if (!this.xAxis && (axis as any).constructor.name === 'Hd3XAxis') {
          this.xAxis = axis;
        }
        if (!this.yAxis && (axis as any).constructor.name === 'Hd3YAxis') {
          this.yAxis = axis;
        }
      }
    }
    
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
    
    // Add chart to discovery if not already there
    if (this.axisDiscovery && !this.axisDiscovery['buses'].includes(chart.getBus())) {
      this.axisDiscovery['buses'].push(chart.getBus());
      const endpoint = new Hd3BusEndpoint({
        listeners: {
          getAxes: (callback: unknown) => {
            this.axisDiscovery!['setAxisManager'](callback);
          },
          axisManagerChanged: (manager: unknown) => {
            this.axisDiscovery!['handleAxisManagerChanged'](manager);
          }
        }
      });
      endpoint.bus = chart.getBus();
      this.axisDiscovery['busEndpoints'].push(endpoint);
      chart.emit('getAxes', this.axisDiscovery);
      
      // Refresh axes
      const axes = this.axisDiscovery.getAxes();
      for (const axis of axes) {
        if (!this.xAxis && (axis as any).constructor.name === 'Hd3XAxis') {
          this.xAxis = axis;
        }
        if (!this.yAxis && (axis as any).constructor.name === 'Hd3YAxis') {
          this.yAxis = axis;
        }
      }
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

    // Connect to chart bus
    this.chartBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        mousemove: (data: unknown) => this.handleMouseMove(data),
        mouseleave: () => this.handleMouseLeave()
      }
    });
    this.chartBusEndpoint.bus = chart.getBus();
  }

  private handleMouseMove(data: unknown): void {
    if (!this.group || !this.chart) return;

    const mouseData = data as { x: number; y: number; mappedCoords?: Record<string, number> };
    
    // Show cursor
    this.group.style('display', null);
    if (this.xLabelGroup) this.xLabelGroup.style('display', null);
    if (this.yLabelGroup) this.yLabelGroup.style('display', null);

    let xValue: number | undefined;
    let yValue: number | undefined;

    // Try to use mapped coordinates first (using domain names)
    if (mouseData.mappedCoords && this.xAxis && this.yAxis) {
      const xDomainName = (this.xAxis as any).axis?.name;
      const yDomainName = (this.yAxis as any).axis?.name;
      if (xDomainName) {
        xValue = mouseData.mappedCoords[xDomainName];
      }
      if (yDomainName) {
        yValue = mouseData.mappedCoords[yDomainName];
      }
    }

    // Fallback to scale inversion (using local chart coordinates)
    if (xValue === undefined && this.xAxis?.scale?.invert) {
      xValue = this.xAxis.scale.invert(mouseData.x);
    }
    if (yValue === undefined && this.yAxis?.scale?.invert) {
      yValue = this.yAxis.scale.invert(mouseData.y);
    }

    // Reconstruct pixel coordinates using this chart's scales
    let finalX: number;
    let finalY: number;
    
    if (xValue !== undefined && this.xAxis?.scale) {
      finalX = this.xAxis.scale(xValue as any);
    } else {
      finalX = this.chart.innerWidth / 2;
    }
    
    if (yValue !== undefined && this.yAxis?.scale) {
      finalY = this.yAxis.scale(yValue as any);
    } else {
      finalY = this.chart.innerHeight / 2;
    }

    // Update cross lines
    if (this.crossLineX) {
      this.crossLineX
        .attr('x1', finalX)
        .attr('x2', finalX);
    }

    if (this.crossLineY) {
      this.crossLineY
        .attr('y1', finalY)
        .attr('y2', finalY);
    }

    // Update axis labels
    if (this.showAxisLabels) {
      if (xValue !== undefined) {
        this.updateXLabel(finalX, xValue);
      }
      if (yValue !== undefined) {
        this.updateYLabel(finalY, yValue);
      }
    }

    // Update markers
    if (this.showMarkers && this.markersGroup && xValue !== undefined) {
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
    this.axisDiscovery?.destroy();
    this.chartBusEndpoint?.destroy();
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
