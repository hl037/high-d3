import type { Hd3InteractionArea } from '../Hd3InteractionArea';
import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3XAxis } from '../../axis/Hd3XAxis';
import type { Hd3YAxis } from '../../axis/Hd3YAxis';
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
  private initialDomains: Map<string, [number | Date | string, number | Date | string] | [number, number]> | null = null;
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

  private handleMouseDown(): void {
    if (!this.isActive) return;

    // Store initial domains
    this.initialDomains = new Map();
    for (const xAxis of this.axes.x) {
      this.initialDomains.set(`x-${xAxis.name}`, [...xAxis.domain]);
    }
    for (const yAxis of this.axes.y) {
      this.initialDomains.set(`y-${yAxis.name}`, [...yAxis.domain]);
    }
  }

  private handleDrag(data: unknown): void {
    if (!this.isActive || !this.initialDomains) return;

    const dragData = data as { dx: number; dy: number };

    // Pan X axes
    for (const xAxis of this.axes.x) {
      const initialDomain = this.initialDomains.get(`x-${xAxis.name}`) as [number, number];
      if (!initialDomain) continue;

      const scale = xAxis.scale as any;
      const dx = dragData.dx;
      
      // Work in viewport space: convert initial domain to pixels, apply shift, convert back
      const minPixel = scale(initialDomain[0]);
      const maxPixel = scale(initialDomain[1]);
      
      const newMinPixel = minPixel - dx;
      const newMaxPixel = maxPixel - dx;
      
      xAxis.domain = [scale.invert(newMinPixel), scale.invert(newMaxPixel)];
    }

    // Pan Y axes (scale already handles Y inversion via range)
    for (const yAxis of this.axes.y) {
      const initialDomain = this.initialDomains.get(`y-${yAxis.name}`) as [number, number];
      if (!initialDomain) continue;

      const scale = yAxis.scale as any;
      const dy = dragData.dy;
      
      // Work in viewport space: convert initial domain to pixels, apply shift, convert back
      const minPixel = scale(initialDomain[0]);
      const maxPixel = scale(initialDomain[1]);
      
      const newMinPixel = minPixel - dy;
      const newMaxPixel = maxPixel - dy;
      
      yAxis.domain = [scale.invert(newMinPixel), scale.invert(newMaxPixel)];
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
