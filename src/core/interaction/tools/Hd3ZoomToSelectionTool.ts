import * as d3 from 'd3';
import type { Hd3Chart } from '../../chart/Hd3Chart';
import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3Bus } from '../../bus/Hd3Bus';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import type { Hd3AxisDomain } from '../../axis/Hd3AxisDomain';
import { Hd3AxesDiscovery } from '../../axis/Hd3AxesDiscovery';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';
import type { DomainEventData, Hd3InteractionArea } from '../Hd3InteractionArea';

export interface Hd3ZoomToSelectionToolOptions {
  chart: Hd3Chart;
  interactionArea: Hd3InteractionArea;
  toolState: Hd3ToolState;
  axes?: (Hd3Axis | string)[];
  buses?: Hd3Bus[];
}

export class Hd3ZoomToSelectionTool {
  private chart: Hd3Chart;
  private interactionArea: Hd3InteractionArea;
  private toolState: Hd3ToolState;
  private axesDiscovery: Hd3AxesDiscovery;
  private isActive: boolean = false;
  private selectionRect?: d3.Selection<SVGRectElement, unknown, null, undefined>;
  private selectionStart?: { x: number; y: number; domains: Map<Hd3AxisDomain, number | Date | string> };
  private toolStateBusEndpoint: Hd3BusEndpoint;
  private interactionBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3ZoomToSelectionToolOptions) {
    this.chart = options.chart;
    this.interactionArea = options.interactionArea;
    this.toolState = options.toolState;
    this.axesDiscovery = new Hd3AxesDiscovery(options.axes || [], options.buses || []);

    this.toolStateBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        toolChanged: (data: unknown) => {
          const change = data as { old: string; new: string };
          this.isActive = change.new === 'zoom-selection';
        }
      }
    });
    this.toolStateBusEndpoint.bus = this.toolState.getBus();

    this.interactionBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        mousedown: (data: unknown) => this.handleMouseDown(data),
        drag: (data: unknown) => this.handleDrag(data),
        dragend: (data: unknown) => this.handleDragEnd(data)
      }
    });
    this.interactionBusEndpoint.bus = this.interactionArea.getBus();
  }

  private handleMouseDown(data: unknown): void {
    if (!this.isActive) return;
    
    const eventData = data as { x: number; y: number };
    
    const domains = new Map<Hd3AxisDomain, number | Date | string>();
    const axes = this.axesDiscovery.getAxes();
    
    for (const axis of axes) {
      const orientation = axis.getOrientation();
      const pixelValue = orientation === 'x' ? eventData.x : eventData.y;
      const scale = axis.scale as { invert?: (value: number) => number | Date };
      
      if (scale.invert) {
        const axisDomain = axis.getAxisDomain();
        domains.set(axisDomain, scale.invert(pixelValue));
      }
    }
    
    this.selectionStart = {
      x: eventData.x,
      y: eventData.y,
      domains
    };

    if (this.selectionRect) {
      this.selectionRect.remove();
    }

    this.selectionRect = this.chart.getMainGroup().append('rect')
      .attr('class', 'zoom-selection')
      .attr('x', eventData.x)
      .attr('y', eventData.y)
      .attr('width', 0)
      .attr('height', 0)
      .style('fill', 'rgba(0, 100, 200, 0.1)')
      .style('stroke', 'rgba(0, 100, 200, 0.5)')
      .style('stroke-width', 1);
  }

  private handleDrag(data: unknown): void {
    if (!this.isActive || !this.selectionStart || !this.selectionRect) return;
    
    const eventData = data as { x: number; y: number };
    const width = Math.abs(eventData.x - this.selectionStart.x);
    const height = Math.abs(eventData.y - this.selectionStart.y);
    const x = Math.min(eventData.x, this.selectionStart.x);
    const y = Math.min(eventData.y, this.selectionStart.y);

    this.selectionRect
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height);
  }

  private handleDragEnd(data: unknown): void {
    if (!this.isActive || !this.selectionStart) return;
    
    const eventData = data as { x: number; y: number };
    
    const axes = this.axesDiscovery.getAxes();
    for (const axis of axes) {
      const axisDomain = axis.getAxisDomain();
      const startValue = this.selectionStart.domains.get(axisDomain);
      
      if (startValue === undefined) continue;
      
      const orientation = axis.getOrientation();
      const endPixel = orientation === 'x' ? eventData.x : eventData.y;
      const scale = axis.scale as { invert?: (value: number) => number | Date };
      
      if (!scale.invert) continue;
      
      const endValue = scale.invert(endPixel);
      
      if (typeof startValue === 'number' && typeof endValue === 'number') {
        const min = Math.min(startValue, endValue);
        const max = Math.max(startValue, endValue);
        
        if (max - min > 0) {
          axisDomain.domain = [min, max];
        }
      }
    }

    if (this.selectionRect) {
      this.selectionRect.remove();
      this.selectionRect = undefined;
    }
    this.selectionStart = undefined;
  }

  destroy(): void {
    this.toolStateBusEndpoint.destroy();
    this.interactionBusEndpoint.destroy();
    if (this.selectionRect) {
      this.selectionRect.remove();
    }
    this.axesDiscovery.destroy();
  }
}
