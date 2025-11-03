import * as d3 from 'd3';
import { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3InteractionArea } from '../Hd3InteractionArea';
import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import type { Hd3Bus } from '../../bus/Hd3Bus';
import type { Hd3AxisDomain } from '../../axis/Hd3AxisDomain';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';
import { Hd3AxesDiscovery } from '../../axis/Hd3AxesDiscovery';

export interface Hd3ZoomToSelectionToolOptions {
  chart: Hd3Chart;
  interactionArea?: Hd3InteractionArea;
  toolState: Hd3ToolState;
  axes?: (Hd3Axis | string)[];
  charts?: Hd3Bus[];
}

/**
 * Zoom to selection tool - drag to select area and zoom to it.
 */
export class Hd3ZoomToSelectionTool {
  private chart: Hd3Chart;
  private toolState: Hd3ToolState;
  private axisDiscovery?: Hd3AxesDiscovery;
  private isActive: boolean = false;
  private selectionRect?: d3.Selection<SVGRectElement, unknown, null, undefined>;
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private chartBusEndpoints: Hd3BusEndpoint[] = [];

  constructor(options: Hd3ZoomToSelectionToolOptions) {
    this.chart = options.chart;
    this.toolState = options.toolState;

    // Create axis discovery
    if (options.axes !== undefined || options.charts !== undefined) {
      const charts = options.charts || [];
      this.axisDiscovery = new Hd3AxesDiscovery(options.axes, charts);
      
      // Listen to chart events
      for (const chart of charts) {
        const endpoint = new Hd3BusEndpoint({
          listeners: {
            mousedown: (data: unknown) => this.handleMouseDown(data),
            drag: (data: unknown) => this.handleDrag(data),
            dragend: (data: unknown) => this.handleDragEnd(data)
          }
        });
        endpoint.bus = chart;
        this.chartBusEndpoints.push(endpoint);
      }
    }

    // Connect to tool state bus
    this.toolStateBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        toolChanged: (data: unknown) => {
          const change = data as { old: string; new: string };
          this.isActive = change.new === 'zoom-selection';
        }
      }
    });
    this.toolStateBusEndpoint.bus = this.toolState.getBus();
  }

  private getAxis(renderer: any): Hd3AxisDomain {
    return renderer.axis as Hd3AxisDomain;
  }

  private handleMouseDown(data: unknown): void {
    if (!this.isActive) return;

    const mouseData = data as { x: number; y: number };
    
    // Create selection rectangle
    if (this.selectionRect) {
      this.selectionRect.remove();
    }

    this.selectionRect = this.chart.getMainGroup()
      .append('rect')
      .attr('class', 'zoom-selection')
      .attr('x', mouseData.x)
      .attr('y', mouseData.y)
      .attr('width', 0)
      .attr('height', 0)
      .attr('fill', 'rgba(100, 150, 255, 0.3)')
      .attr('stroke', 'rgba(50, 100, 200, 0.8)')
      .attr('stroke-width', 1)
      .attr('pointer-events', 'none');
  }

  private handleDrag(data: unknown): void {
    if (!this.isActive || !this.selectionRect) return;

    const dragData = data as { startX: number; startY: number; x: number; y: number };
    
    const x = Math.min(dragData.startX, dragData.x);
    const y = Math.min(dragData.startY, dragData.y);
    const width = Math.abs(dragData.x - dragData.startX);
    const height = Math.abs(dragData.y - dragData.startY);

    this.selectionRect
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height);
  }

  private handleDragEnd(data: unknown): void {
    if (!this.isActive || !this.selectionRect || !this.axisDiscovery) return;

    const dragData = data as {
      startMappedCoords?: Record<string, number>;
      mappedCoords?: Record<string, number>;
    };
    
    // Remove selection rectangle
    this.selectionRect.remove();
    this.selectionRect = undefined;

    if (!dragData.startMappedCoords || !dragData.mappedCoords) return;

    // Zoom to selection using mapped coordinates
    const axes = this.axisDiscovery.getAxes();
    for (const axis of axes) {
      const axisDomain = this.getAxis(axis);
      const name = (axis as any).name;
      const start = dragData.startMappedCoords[name];
      const end = dragData.mappedCoords[name];
      
      if (start === undefined || end === undefined) continue;
      
      // Ensure min/max order
      const newDomain: [number, number] = [
        Math.min(start, end),
        Math.max(start, end)
      ];
      
      axisDomain.domain = newDomain;
    }
  }

  destroy(): void {
    this.axisDiscovery?.destroy();
    this.toolStateBusEndpoint.destroy();
    for (const endpoint of this.chartBusEndpoints) {
      endpoint.destroy();
    }
    if (this.selectionRect) {
      this.selectionRect.remove();
    }
  }
}
