import * as d3 from 'd3';
import { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3InteractionArea } from '../Hd3InteractionArea';
import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3XAxis } from '../../axis/Hd3XAxis';
import type { Hd3YAxis } from '../../axis/Hd3YAxis';
import type { Hd3AxisDomain } from '../../axis/Hd3Axis';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';

export interface Hd3ZoomToSelectionToolOptions {
  chart: Hd3Chart;
  interactionArea: Hd3InteractionArea;
  toolState: Hd3ToolState;
  axes: { x: Hd3XAxis[]; y: Hd3YAxis[] };
}

/**
 * Zoom to selection tool - drag to select area and zoom to it.
 */
export class Hd3ZoomToSelectionTool {
  private chart: Hd3Chart;
  private interactionArea: Hd3InteractionArea;
  private toolState: Hd3ToolState;
  private axes: { x: Hd3XAxis[]; y: Hd3YAxis[] };
  private isActive: boolean = false;
  private selectionRect?: d3.Selection<SVGRectElement, unknown, null, undefined>;
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private interactionBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3ZoomToSelectionToolOptions) {
    this.chart = options.chart;
    this.interactionArea = options.interactionArea;
    this.toolState = options.toolState;
    this.axes = options.axes;

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

    // Connect to interaction bus
    this.interactionBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        mousedown: (data: unknown) => this.handleMouseDown(data),
        drag: (data: unknown) => this.handleDrag(data),
        dragend: (data: unknown) => this.handleDragEnd(data)
      }
    });
    this.interactionBusEndpoint.bus = this.interactionArea.getBus();
  }

  private getAxis(renderer: Hd3XAxis | Hd3YAxis): Hd3AxisDomain {
    return (renderer as any).axis as Hd3AxisDomain;
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
      .attr('pointer-events', 'none'); // Don't capture mouse events
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
    if (!this.isActive || !this.selectionRect) return;

    const dragData = data as { startX: number; startY: number; x: number; y: number };
    
    const x1 = Math.min(dragData.startX, dragData.x);
    const x2 = Math.max(dragData.startX, dragData.x);
    const y1 = Math.min(dragData.startY, dragData.y);
    const y2 = Math.max(dragData.startY, dragData.y);

    // Remove selection rectangle
    this.selectionRect.remove();
    this.selectionRect = undefined;

    // Zoom to selection
    if (Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5) {
      // Zoom X axes
      for (const xAxis of this.axes.x) {
        const axis = this.getAxis(xAxis);
        const scale = xAxis.scale as { invert: (x: number) => number };
        const newDomain: [number, number] = [scale.invert(x1), scale.invert(x2)];
        axis.domain = newDomain;
      }

      // Zoom Y axes
      for (const yAxis of this.axes.y) {
        const axis = this.getAxis(yAxis);
        const scale = yAxis.scale as { invert: (y: number) => number };
        const newDomain: [number, number] = [scale.invert(y2), scale.invert(y1)];
        axis.domain = newDomain;
      }
    }
  }

  destroy(): void {
    this.toolStateBusEndpoint.destroy();
    this.interactionBusEndpoint.destroy();
    if (this.selectionRect) {
      this.selectionRect.remove();
    }
  }
}
