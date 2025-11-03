import type { Hd3InteractionArea } from '../Hd3InteractionArea';
import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import type { Hd3Bus } from '../../bus/Hd3Bus';
import type { Hd3AxisDomain } from '../../axis/Hd3AxisDomain';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';
import { Hd3AxesDiscovery } from '../../axis/Hd3AxesDiscovery';

export interface Hd3ZoomToolOptions {
  interactionArea?: Hd3InteractionArea;
  toolState: Hd3ToolState;
  axes?: (Hd3Axis | string)[];
  charts?: Hd3Bus[];
}

/**
 * Zoom tool for zooming in/out with mouse wheel or click.
 */
export class Hd3ZoomTool {
  private toolState: Hd3ToolState;
  private axisDiscovery?: Hd3AxesDiscovery;
  private zoomInActive: boolean = false;
  private zoomOutActive: boolean = false;
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private chartBusEndpoints: Hd3BusEndpoint[] = [];

  constructor(options: Hd3ZoomToolOptions) {
    this.toolState = options.toolState;

    // Create axis discovery
    if (options.axes !== undefined || options.charts !== undefined) {
      const charts = options.charts || [];
      this.axisDiscovery = new Hd3AxesDiscovery(options.axes, charts);
      
      // Listen to chart events
      for (const chart of charts) {
        const endpoint = new Hd3BusEndpoint({
          listeners: {
            wheel: (data: unknown) => this.handleWheel(data),
            mousedown: (data: unknown) => this.handleClick(data)
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
          this.zoomInActive = change.new === 'zoom-in';
          this.zoomOutActive = change.new === 'zoom-out';
        }
      }
    });
    this.toolStateBusEndpoint.bus = this.toolState.getBus();
  }

  private getAxis(renderer: any): Hd3AxisDomain {
    return renderer.axis as Hd3AxisDomain;
  }

  private handleWheel(data: unknown): void {
    const wheelData = data as { mappedCoords?: Record<string, number>; delta: number };
    const zoomFactor = wheelData.delta > 0 ? 1.1 : 0.9;
    this.zoom(wheelData.mappedCoords, zoomFactor);
  }

  private handleClick(data: unknown): void {
    if (!this.zoomInActive && !this.zoomOutActive) return;

    const clickData = data as { mappedCoords?: Record<string, number> };
    const zoomFactor = this.zoomInActive ? 0.8 : 1.25;
    this.zoom(clickData.mappedCoords, zoomFactor);
  }

  private zoom(mappedCoords: Record<string, number> | undefined, factor: number): void {
    if (!this.axisDiscovery || !mappedCoords) return;

    const axes = this.axisDiscovery.getAxes();
    for (const axis of axes) {
      const axisDomain = this.getAxis(axis);
      const domainName = axisDomain.name;
      const centerValue = mappedCoords[domainName];
      
      if (centerValue === undefined) continue;
      
      const domain = axisDomain.domain as [number, number];
      const domainWidth = domain[1] - domain[0];
      const newWidth = domainWidth * factor;
      const leftRatio = (centerValue - domain[0]) / domainWidth;
      
      axisDomain.domain = [
        centerValue - newWidth * leftRatio,
        centerValue + newWidth * (1 - leftRatio)
      ];
    }
  }

  destroy(): void {
    this.axisDiscovery?.destroy();
    this.toolStateBusEndpoint.destroy();
    for (const endpoint of this.chartBusEndpoints) {
      endpoint.destroy();
    }
  }
}
