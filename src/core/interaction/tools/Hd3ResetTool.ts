import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import type { Hd3Bus } from '../../bus/Hd3Bus';
import type { Hd3AxisDomain } from '../../axis/Hd3AxisDomain';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';
import { Hd3AxesDiscovery } from '../../axis/Hd3AxesDiscovery';

export interface Hd3ResetToolOptions {
  toolState: Hd3ToolState;
  axes?: (Hd3Axis | string)[];
  charts?: Hd3Bus[];
}

/**
 * Reset tool to restore original axis domains.
 */
export class Hd3ResetTool {
  private toolState: Hd3ToolState;
  private axisDiscovery?: Hd3AxesDiscovery;
  private originalDomains: Map<string, [number | Date | string, number | Date | string] | string[]>;
  private toolStateBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3ResetToolOptions) {
    this.toolState = options.toolState;
    this.originalDomains = new Map();

    // Create axis discovery
    if (options.axes !== undefined || options.charts !== undefined) {
      const charts = options.charts || [];
      this.axisDiscovery = new Hd3AxesDiscovery(options.axes, charts);
      
      // Store original domains
      const axes = this.axisDiscovery.getAxes();
      for (const axis of axes) {
        const axisDomain = this.getAxis(axis);
        const domainName = axisDomain.name;
        this.originalDomains.set(domainName, Array.isArray(axisDomain.domain) ? [...axisDomain.domain] : axisDomain.domain);
      }
    }

    // Connect to tool state bus
    this.toolStateBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        toolChanged: (data: unknown) => {
          const change = data as { old: string; new: string };
          if (change.new === 'reset') {
            this.reset();
            // Reset tool state back to none
            setTimeout(() => {
              this.toolState.currentTool = 'none';
            }, 100);
          }
        }
      }
    });
    this.toolStateBusEndpoint.bus = this.toolState.getBus();
  }

  private getAxis(renderer: any): Hd3AxisDomain {
    return renderer.axis as Hd3AxisDomain;
  }

  reset(): void {
    if (!this.axisDiscovery) return;
    
    const axes = this.axisDiscovery.getAxes();
    for (const axis of axes) {
      const axisDomain = this.getAxis(axis);
      const domainName = axisDomain.name;
      const original = this.originalDomains.get(domainName);
      if (original) {
        axisDomain.domain = original as [number | Date | string, number | Date | string] | string[];
      }
    }
  }

  destroy(): void {
    this.axisDiscovery?.destroy();
    this.toolStateBusEndpoint.destroy();
  }
}
