import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3Bus } from '../../bus/Hd3Bus';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import type { Hd3AxisDomain } from '../../axis/Hd3AxisDomain';
import { Hd3AxesDiscovery } from '../../axis/Hd3AxesDiscovery';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';
import type { DomainEventData } from '../Hd3InteractionArea';

export interface Hd3ZoomToolOptions {
  toolState: Hd3ToolState;
  axes?: (Hd3Axis | string)[];
  buses?: Hd3Bus[];
  zoomFactor?: number;
}

export class Hd3ZoomTool {
  private toolState: Hd3ToolState;
  private axesDiscovery: Hd3AxesDiscovery;
  private zoomFactor: number;
  private activeMode: 'zoom-in' | 'zoom-out' | null = null;
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private domainBusEndpoints: Map<Hd3AxisDomain, Hd3BusEndpoint> = new Map();

  constructor(options: Hd3ZoomToolOptions) {
    this.toolState = options.toolState;
    this.axesDiscovery = new Hd3AxesDiscovery(options.axes || [], options.buses || []);
    this.zoomFactor = options.zoomFactor || 0.1;

    this.toolStateBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        toolChanged: (data: unknown) => {
          const change = data as { old: string; new: string };
          this.activeMode = (change.new === 'zoom-in' || change.new === 'zoom-out') ? change.new : null;
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
          wheel: (data: unknown) => this.handleWheel(axisDomain, data),
          mousedown: (data: unknown) => this.handleMouseDown(axisDomain, data)
        }
      });
      endpoint.bus = axisDomain.getBus();
      this.domainBusEndpoints.set(axisDomain, endpoint);
    }
  }

  private handleWheel(axisDomain: Hd3AxisDomain, data: unknown): void {
    if (!this.activeMode) return;
    
    const eventData = data as DomainEventData & { delta?: number };
    const domain = axisDomain.domain;
    
    if (!Array.isArray(domain) || domain.length !== 2) return;
    if (typeof domain[0] !== 'number' || typeof domain[1] !== 'number') return;
    
    const delta = eventData.delta || 0;
    const zoomIn = delta < 0;
    const factor = zoomIn ? (1 - this.zoomFactor) : (1 + this.zoomFactor);
    
    const centerValue = eventData.value as number;
    const min = domain[0];
    const max = domain[1];
    
    const newMin = centerValue - (centerValue - min) * factor;
    const newMax = centerValue + (max - centerValue) * factor;
    
    axisDomain.domain = [newMin, newMax];
  }

  private handleMouseDown(axisDomain: Hd3AxisDomain, data: unknown): void {
    if (!this.activeMode) return;
    
    const eventData = data as DomainEventData;
    const domain = axisDomain.domain;
    
    if (!Array.isArray(domain) || domain.length !== 2) return;
    if (typeof domain[0] !== 'number' || typeof domain[1] !== 'number') return;
    
    const zoomIn = this.activeMode === 'zoom-in';
    const factor = zoomIn ? (1 - this.zoomFactor) : (1 + this.zoomFactor);
    
    const centerValue = eventData.value as number;
    const min = domain[0];
    const max = domain[1];
    
    const newMin = centerValue - (centerValue - min) * factor;
    const newMax = centerValue + (max - centerValue) * factor;
    
    axisDomain.domain = [newMin, newMax];
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
