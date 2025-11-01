import type { Hd3InteractionArea } from '../Hd3InteractionArea';
import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3XAxis } from '../../axis/Hd3XAxis';
import type { Hd3YAxis } from '../../axis/Hd3YAxis';
import type { Hd3AxisDomain } from '../../axis/Hd3AxisDomain';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';

export interface Hd3PanToolOptions {
  interactionArea: Hd3InteractionArea;
  toolState: Hd3ToolState;
  axes: { x: Hd3XAxis[]; y: Hd3YAxis[] };
}

/**
 * Pan tool for dragging the chart view.
 */
export class Hd3PanTool {
  private interactionArea: Hd3InteractionArea;
  private toolState: Hd3ToolState;
  private axes: { x: Hd3XAxis[]; y: Hd3YAxis[] };
  private isActive: boolean = false;
  private initialDomains: Map<string, [number | Date | string, number | Date | string] | string[]> | null = null;
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private interactionBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3PanToolOptions) {
    this.interactionArea = options.interactionArea;
    this.toolState = options.toolState;
    this.axes = options.axes;

    // Connect to tool state bus
    this.toolStateBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        toolChanged: (data: unknown) => {
          const change = data as { old: string; new: string };
          this.isActive = change.new === 'pan';
        }
      }
    });
    this.toolStateBusEndpoint.bus = this.toolState.getBus();

    // Connect to interaction bus
    this.interactionBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        mousedown: () => this.handleMouseDown(),
        drag: (data: unknown) => this.handleDrag(data),
        dragend: () => this.handleDragEnd()
      }
    });
    this.interactionBusEndpoint.bus = this.interactionArea.getBus();
  }

  private getAxis(renderer: Hd3XAxis | Hd3YAxis): Hd3AxisDomain {
    return (renderer as any).axis as Hd3AxisDomain;
  }

  private handleMouseDown(): void {
    if (!this.isActive) return;

    // Store initial domains
    this.initialDomains = new Map();
    for (const xAxis of this.axes.x) {
      const axis = this.getAxis(xAxis);
      this.initialDomains.set(`x-${xAxis.name}`, Array.isArray(axis.domain) ? [...axis.domain] : axis.domain);
    }
    for (const yAxis of this.axes.y) {
      const axis = this.getAxis(yAxis);
      this.initialDomains.set(`y-${yAxis.name}`, Array.isArray(axis.domain) ? [...axis.domain] : axis.domain);
    }
  }

  private handleDrag(data: unknown): void {
    if (!this.isActive || !this.initialDomains) return;

    const dragData = data as { dx: number; dy: number };

    // Pan X axes
    for (const xAxis of this.axes.x) {
      const axis = this.getAxis(xAxis);
      const initialDomain = this.initialDomains.get(`x-${xAxis.name}`) as [number, number];
      if (!initialDomain) continue;

      const scale = xAxis.scale as any;
      const dx = dragData.dx;
      
      const minPixel = scale(initialDomain[0]);
      const maxPixel = scale(initialDomain[1]);
      
      const newMinPixel = minPixel - dx;
      const newMaxPixel = maxPixel - dx;
      
      axis.domain = [scale.invert(newMinPixel), scale.invert(newMaxPixel)];
    }

    // Pan Y axes
    for (const yAxis of this.axes.y) {
      const axis = this.getAxis(yAxis);
      const initialDomain = this.initialDomains.get(`y-${yAxis.name}`) as [number, number];
      if (!initialDomain) continue;

      const scale = yAxis.scale as any;
      const dy = dragData.dy;
      
      const minPixel = scale(initialDomain[0]);
      const maxPixel = scale(initialDomain[1]);
      
      const newMinPixel = minPixel - dy;
      const newMaxPixel = maxPixel - dy;
      
      axis.domain = [scale.invert(newMinPixel), scale.invert(newMaxPixel)];
    }
  }

  private handleDragEnd(): void {
    this.initialDomains = null;
  }

  destroy(): void {
    this.toolStateBusEndpoint.destroy();
    this.interactionBusEndpoint.destroy();
  }
}
