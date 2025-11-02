import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3Bus } from '../../bus/Hd3Bus';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import type { Hd3AxisDomain } from '../../axis/Hd3AxisDomain';
import { Hd3AxesDiscovery } from '../../axis/Hd3AxesDiscovery';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';
import type { DomainEventData } from '../Hd3InteractionArea';

export interface Hd3PanToolOptions {
  toolState: Hd3ToolState;
  axes?: (Hd3Axis | string)[];
  buses?: Hd3Bus[];
}

export class Hd3PanTool {
  private toolState: Hd3ToolState;
  private axesDiscovery: Hd3AxesDiscovery;
  private isActive: boolean = false;
  private initialDomains: Map<Hd3AxisDomain, [number | Date | string, number | Date | string] | string[]> = new Map();
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private domainBusEndpoints: Map<Hd3AxisDomain, Hd3BusEndpoint> = new Map();

  constructor(options: Hd3PanToolOptions) {
    this.toolState = options.toolState;
    this.axesDiscovery = new Hd3AxesDiscovery(options.axes || [], options.buses || []);

    this.toolStateBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        toolChanged: (data: unknown) => {
          const change = data as { old: string; new: string };
          this.isActive = change.new === 'pan';
        }
      }
    });
    this.toolStateBusEndpoint.bus = this.toolState.getBus();

    this.setupAxisListeners();
  }

  private setupAxisListeners(): void {
    const axes = this.axesDiscovery.getAxes();
    
    for (const axis of axes) {
      const axisDomain = axis.getAxisDomain();
      
      const endpoint = new Hd3BusEndpoint({
        listeners: {
          mousedown: () => this.handleMouseDown(axisDomain),
          drag: (data: unknown) => this.handleDrag(axisDomain, data),
          dragend: () => this.handleDragEnd(axisDomain)
        }
      });
      endpoint.bus = axisDomain.getBus();
      this.domainBusEndpoints.set(axisDomain, endpoint);
    }
  }

  private handleMouseDown(axisDomain: Hd3AxisDomain): void {
    if (!this.isActive) return;
    
    const domain = axisDomain.domain;
    this.initialDomains.set(
      axisDomain, 
      Array.isArray(domain) ? [...domain] : domain
    );
  }

  private handleDrag(axisDomain: Hd3AxisDomain, data: unknown): void {
    if (!this.isActive) return;
    
    const eventData = data as DomainEventData & { startX?: number; startY?: number };
    const initialDomain = this.initialDomains.get(axisDomain);
    
    if (!initialDomain || !Array.isArray(initialDomain)) return;
    
    const axis = this.findAxisForDomain(axisDomain);
    if (!axis) return;
    
    const orientation = axis.getOrientation();
    const startPixel = orientation === 'x' ? eventData.startX : eventData.startY;
    
    if (startPixel === undefined) return;
    
    const scale = axis.scale as { invert?: (value: number) => number | Date };
    if (!scale.invert) return;
    
    const startValue = scale.invert(startPixel);
    const currentValue = eventData.value;
    
    if (typeof startValue !== 'number' || typeof currentValue !== 'number') return;
    
    const delta = currentValue - startValue;
    
    axisDomain.domain = [
      (initialDomain[0] as number) - delta,
      (initialDomain[1] as number) - delta
    ];
  }

  private handleDragEnd(axisDomain: Hd3AxisDomain): void {
    this.initialDomains.delete(axisDomain);
  }

  private findAxisForDomain(axisDomain: Hd3AxisDomain): Hd3Axis | undefined {
    const axes = this.axesDiscovery.getAxes();
    return axes.find(axis => axis.getAxisDomain() === axisDomain);
  }

  destroy(): void {
    this.toolStateBusEndpoint.destroy();
    for (const endpoint of this.domainBusEndpoints.values()) {
      endpoint.destroy();
    }
    this.domainBusEndpoints.clear();
    this.axesDiscovery.destroy();
  }
}
