import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3XAxisRenderer } from '../../axis/Hd3XAxisRenderer';
import type { Hd3YAxisRenderer } from '../../axis/Hd3YAxisRenderer';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';

export interface Hd3ResetToolOptions {
  toolState: Hd3ToolState;
  axisRenderers: { x: Hd3XAxisRenderer[]; y: Hd3YAxisRenderer[] };
}

/**
 * Reset tool to restore original axis domains.
 */
export class Hd3ResetTool {
  private toolState: Hd3ToolState;
  private axisRenderers: { x: Hd3XAxisRenderer[]; y: Hd3YAxisRenderer[] };
  private originalDomains: Map<string, [number | Date | string, number | Date | string] | string[]>;
  private toolStateBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3ResetToolOptions) {
    this.toolState = options.toolState;
    this.axisRenderers = options.axisRenderers;
    this.originalDomains = new Map();

    // Store original domains
    for (const xAxisRenderer of this.axisRenderers.x) {
      const axis = this.getAxis(xAxisRenderer);
      this.originalDomains.set(`x-${xAxisRenderer.name}`, Array.isArray(axis.domain) ? [...axis.domain] : axis.domain);
    }
    for (const yAxisRenderer of this.axisRenderers.y) {
      const axis = this.getAxis(yAxisRenderer);
      this.originalDomains.set(`y-${yAxisRenderer.name}`, Array.isArray(axis.domain) ? [...axis.domain] : axis.domain);
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

  private getAxis(renderer: Hd3XAxisRenderer | Hd3YAxisRenderer): Hd3Axis {
    return (renderer as any).axis as Hd3Axis;
  }

  reset(): void {
    // Restore X axes
    for (const xAxisRenderer of this.axisRenderers.x) {
      const axis = this.getAxis(xAxisRenderer);
      const original = this.originalDomains.get(`x-${xAxisRenderer.name}`);
      if (original) {
        axis.domain = original as [number | Date | string, number | Date | string] | string[];
      }
    }

    // Restore Y axes
    for (const yAxisRenderer of this.axisRenderers.y) {
      const axis = this.getAxis(yAxisRenderer);
      const original = this.originalDomains.get(`y-${yAxisRenderer.name}`);
      if (original) {
        axis.domain = original as [number | Date | string, number | Date | string] | string[];
      }
    }
  }

  destroy(): void {
    this.toolStateBusEndpoint.destroy();
  }
}
