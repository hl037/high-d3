import type { Hd3InteractionArea } from '../Hd3InteractionArea';
import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3XAxis } from '../../axis/Hd3XAxis';
import type { Hd3YAxis } from '../../axis/Hd3YAxis';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';

export interface Hd3ZoomToolOptions {
  interactionArea: Hd3InteractionArea;
  toolState: Hd3ToolState;
  axes: { x: Hd3XAxis[]; y: Hd3YAxis[] };
}

/**
 * Zoom tool for zooming in/out with mouse wheel or click.
 */
export class Hd3ZoomTool {
  private interactionArea: Hd3InteractionArea;
  private toolState: Hd3ToolState;
  private axes: { x: Hd3XAxis[]; y: Hd3YAxis[] };
  private zoomInActive: boolean = false;
  private zoomOutActive: boolean = false;
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private interactionBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3ZoomToolOptions) {
    this.interactionArea = options.interactionArea;
    this.toolState = options.toolState;
    this.axes = options.axes;

    // Connect to tool state bus
    this.toolStateBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        toolChanged: (data: unknown) => {
          const change = data as { old: string; new: string };
          this.zoomInActive = change.new === 'zoom-in';
          this.zoomOutActive = change.new === 'zoom-out';
        }
      }
    });
    this.toolStateBusEndpoint.bus = this.toolState.getBus();

    // Connect to interaction bus
    this.interactionBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        wheel: (data: unknown) => this.handleWheel(data),
        mousedown: (data: unknown) => this.handleClick(data)
      }
    });
    this.interactionBusEndpoint.bus = this.interactionArea.getBus();
  }

  private handleWheel(data: unknown): void {
    const wheelData = data as { x: number; y: number; delta: number };
    const zoomFactor = wheelData.delta > 0 ? 1.1 : 0.9;
    this.zoom(wheelData.x, wheelData.y, zoomFactor);
  }

  private handleClick(data: unknown): void {
    if (!this.zoomInActive && !this.zoomOutActive) return;

    const clickData = data as { x: number; y: number };
    const zoomFactor = this.zoomInActive ? 0.8 : 1.25;
    this.zoom(clickData.x, clickData.y, zoomFactor);
  }

  private zoom(centerX: number, centerY: number, factor: number): void {
    // Zoom X axes
    for (const xAxis of this.axes.x) {
      const domain = xAxis.domain as [number, number];
      const range = xAxis.range;
      
      // Find the data value at the center point
      const scale = xAxis.scale as { invert: (x: number) => number };
      const centerValue = scale.invert(centerX);
      
      // Calculate new domain
      const domainWidth = domain[1] - domain[0];
      const newWidth = domainWidth * factor;
      const leftRatio = (centerValue - domain[0]) / domainWidth;
      
      xAxis.domain = [
        centerValue - newWidth * leftRatio,
        centerValue + newWidth * (1 - leftRatio)
      ];
    }

    // Zoom Y axes
    for (const yAxis of this.axes.y) {
      const domain = yAxis.domain;
      const range = yAxis.range;
      
      // Find the data value at the center point
      const scale = yAxis.scale as { invert: (y: number) => number };
      const centerValue = scale.invert(centerY);
      
      // Calculate new domain
      const domainHeight = domain[1] - domain[0];
      const newHeight = domainHeight * factor;
      const bottomRatio = (centerValue - domain[0]) / domainHeight;
      
      yAxis.domain = [
        centerValue - newHeight * bottomRatio,
        centerValue + newHeight * (1 - bottomRatio)
      ];
    }
  }

  destroy(): void {
    this.toolStateBusEndpoint.destroy();
    this.interactionBusEndpoint.destroy();
  }
}
