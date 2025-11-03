import type { Hd3InteractionArea } from '../Hd3InteractionArea';
import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import type { Hd3Bus } from '../../bus/Hd3Bus';
import type { Hd3AxisDomain } from '../../axis/Hd3AxisDomain';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';
import { Hd3AxesDiscovery } from '../../axis/Hd3AxesDiscovery';

export interface Hd3PanToolOptions {
  interactionArea?: Hd3InteractionArea;
  toolState: Hd3ToolState;
  axes?: (Hd3Axis | string)[];
  charts?: Hd3Bus[];
}

/**
 * Pan tool for dragging the chart view.
 */
export class Hd3PanTool {
  private toolState: Hd3ToolState;
  private axisDiscovery?: Hd3AxesDiscovery;
  private isActive: boolean = false;
  private initialDomains: Map<string, [number | Date | string, number | Date | string] | string[]> | null = null;
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private chartBusEndpoints: Hd3BusEndpoint[] = [];

  constructor(options: Hd3PanToolOptions) {
    this.toolState = options.toolState;
    
    // Create axis discovery
    if (options.axes !== undefined || options.charts !== undefined) {
      const charts = options.charts || [];
      this.axisDiscovery = new Hd3AxesDiscovery(options.axes, charts);
      
      // Listen to chart events
      for (const chart of charts) {
        const endpoint = new Hd3BusEndpoint({
          listeners: {
            mousedown: () => this.handleMouseDown(),
            drag: (data: unknown) => this.handleDrag(data),
            dragend: () => this.handleDragEnd()
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
          this.isActive = change.new === 'pan';
        }
      }
    });
    this.toolStateBusEndpoint.bus = this.toolState.getBus();
  }

  private getAxis(renderer: any): Hd3AxisDomain {
    return renderer.axis as Hd3AxisDomain;
  }

  private handleMouseDown(): void {
    if (!this.isActive || !this.axisDiscovery) return;

    // Store initial domains
    this.initialDomains = new Map();
    const axes = this.axisDiscovery.getAxes();
    for (const axis of axes) {
      const axisDomain = this.getAxis(axis);
      const domainName = axisDomain.name;
      this.initialDomains.set(domainName, Array.isArray(axisDomain.domain) ? [...axisDomain.domain] : axisDomain.domain);
    }
  }

  private handleDrag(data: unknown): void {
    if (!this.isActive || !this.initialDomains || !this.axisDiscovery) return;

    const dragData = data as { mappedCoords?: Record<string, number>; startMappedCoords?: Record<string, number> };
    
    if (!dragData.mappedCoords || !dragData.startMappedCoords) return;

    const axes = this.axisDiscovery.getAxes();
    for (const axis of axes) {
      const axisDomain = this.getAxis(axis);
      const domainName = axisDomain.name;
      const initialDomain = this.initialDomains.get(domainName);
      
      if (!initialDomain || !Array.isArray(initialDomain)) continue;
      
      const currentValue = dragData.mappedCoords[domainName];
      const startValue = dragData.startMappedCoords[domainName];
      
      if (currentValue === undefined || startValue === undefined) continue;
      
      const delta = currentValue - startValue;
      axisDomain.domain = [
        (initialDomain[0] as number) - delta,
        (initialDomain[1] as number) - delta
      ];
    }
  }

  private handleDragEnd(): void {
    this.initialDomains = null;
  }

  destroy(): void {
    this.axisDiscovery?.destroy();
    this.toolStateBusEndpoint.destroy();
    for (const endpoint of this.chartBusEndpoints) {
      endpoint.destroy();
    }
  }
}
