import type { Hd3InteractionArea } from '../Hd3InteractionArea';
import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3XAxisRenderer } from '../../axis/Hd3XAxisRenderer';
import type { Hd3YAxisRenderer } from '../../axis/Hd3YAxisRenderer';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';

export interface Hd3PanToolOptions {
  interactionArea: Hd3InteractionArea;
  toolState: Hd3ToolState;
  axisRenderers: { x: Hd3XAxisRenderer[]; y: Hd3YAxisRenderer[] };
}

/**
 * Pan tool for dragging the chart view.
 */
export class Hd3PanTool {
  private interactionArea: Hd3InteractionArea;
  private toolState: Hd3ToolState;
  private axisRenderers: { x: Hd3XAxisRenderer[]; y: Hd3YAxisRenderer[] };
  private isActive: boolean = false;
  private initialDomains: Map<string, [number | Date | string, number | Date | string] | string[]> | null = null;
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private interactionBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3PanToolOptions) {
    this.interactionArea = options.interactionArea;
    this.toolState = options.toolState;
    this.axisRenderers = options.axisRenderers;

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

  private getAxis(renderer: Hd3XAxisRenderer | Hd3YAxisRenderer): Hd3Axis {
    return (renderer as any).axis as Hd3Axis;
  }

  private handleMouseDown(): void {
    if (!this.isActive) return;

    // Store initial domains
    this.initialDomains = new Map();
    for (const xAxisRenderer of this.axisRenderers.x) {
      const axis = this.getAxis(xAxisRenderer);
      this.initialDomains.set(`x-${xAxisRenderer.name}`, Array.isArray(axis.domain) ? [...axis.domain] : axis.domain);
    }
    for (const yAxisRenderer of this.axisRenderers.y) {
      const axis = this.getAxis(yAxisRenderer);
      this.initialDomains.set(`y-${yAxisRenderer.name}`, Array.isArray(axis.domain) ? [...axis.domain] : axis.domain);
    }
  }

  private handleDrag(data: unknown): void {
    if (!this.isActive || !this.initialDomains) return;

    const dragData = data as { dx: number; dy: number };

    // Pan X axes
    for (const xAxisRenderer of this.axisRenderers.x) {
      const axis = this.getAxis(xAxisRenderer);
      const initialDomain = this.initialDomains.get(`x-${xAxisRenderer.name}`) as [number, number];
      if (!initialDomain) continue;

      const scale = xAxisRenderer.scale as any;
      const dx = dragData.dx;
      
      const minPixel = scale(initialDomain[0]);
      const maxPixel = scale(initialDomain[1]);
      
      const newMinPixel = minPixel - dx;
      const newMaxPixel = maxPixel - dx;
      
      axis.domain = [scale.invert(newMinPixel), scale.invert(newMaxPixel)];
    }

    // Pan Y axes
    for (const yAxisRenderer of this.axisRenderers.y) {
      const axis = this.getAxis(yAxisRenderer);
      const initialDomain = this.initialDomains.get(`y-${yAxisRenderer.name}`) as [number, number];
      if (!initialDomain) continue;

      const scale = yAxisRenderer.scale as any;
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
