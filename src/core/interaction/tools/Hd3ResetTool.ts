import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3Bus } from '../../bus/Hd3Bus';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import type { Hd3AxisDomain } from '../../axis/Hd3AxisDomain';
import { Hd3AxesDiscovery } from '../../axis/Hd3AxesDiscovery';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';

export interface Hd3ResetToolOptions {
  toolState: Hd3ToolState;
  axes?: (Hd3Axis | string)[];
  buses?: Hd3Bus[];
}

export class Hd3ResetTool {
  private toolState: Hd3ToolState;
  private axesDiscovery: Hd3AxesDiscovery;
  private initialDomains: Map<Hd3AxisDomain, [number | Date | string, number | Date | string] | string[]> = new Map();
  private toolStateBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3ResetToolOptions) {
    this.toolState = options.toolState;
    this.axesDiscovery = new Hd3AxesDiscovery(options.axes || [], options.buses || []);

    const axes = this.axesDiscovery.getAxes();
    for (const axis of axes) {
      const axisDomain = axis.getAxisDomain();
      const domain = axisDomain.domain;
      this.initialDomains.set(
        axisDomain,
        Array.isArray(domain) ? [...domain] : domain
      );
    }

    this.toolStateBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        toolChanged: (data: unknown) => {
          const change = data as { old: string; new: string };
          if (change.new === 'reset') {
            this.reset();
          }
        }
      }
    });
    this.toolStateBusEndpoint.bus = this.toolState.getBus();
  }

  private reset(): void {
    for (const [axisDomain, initialDomain] of this.initialDomains.entries()) {
      axisDomain.domain = Array.isArray(initialDomain) ? [...initialDomain] : initialDomain;
    }
  }

  destroy(): void {
    this.toolStateBusEndpoint.destroy();
    this.axesDiscovery.destroy();
  }
}
