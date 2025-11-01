import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3XAxis } from '../../axis/Hd3XAxis';
import type { Hd3YAxis } from '../../axis/Hd3YAxis';
import type { Hd3Axis } from '../../axis/Hd3Axis';
import { Hd3BusEndpoint } from '../../bus/Hd3BusEndpoint';

export interface Hd3ResetToolOptions {
  toolState: Hd3ToolState;
  axes: { x: Hd3XAxis[]; y: Hd3YAxis[] };
}

/**
 * Reset tool to restore original axis domains.
 */
export class Hd3ResetTool {
  private toolState: Hd3ToolState;
  private axes: { x: Hd3XAxis[]; y: Hd3YAxis[] };
  private originalDomains: Map<string, [number | Date | string, number | Date | string] | string[]>;
  private toolStateBusEndpoint: Hd3BusEndpoint;

  constructor(options: Hd3ResetToolOptions) {
    this.toolState = options.toolState;
    this.axes = options.axes;
    this.originalDomains = new Map();

    // Store original domains
    for (const xAxis of this.axes.x) {
      const axis = this.getAxis(xAxis);
      this.originalDomains.set(`x-${xAxis.name}`, Array.isArray(axis.domain) ? [...axis.domain] : axis.domain);
    }
    for (const yAxis of this.axes.y) {
      const axis = this.getAxis(yAxis);
      this.originalDomains.set(`y-${yAxis.name}`, Array.isArray(axis.domain) ? [...axis.domain] : axis.domain);
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

  private getAxis(renderer: Hd3XAxis | Hd3YAxis): Hd3Axis {
    return (renderer as any).axis as Hd3Axis;
  }

  reset(): void {
    // Restore X axes
    for (const xAxis of this.axes.x) {
      const axis = this.getAxis(xAxis);
      const original = this.originalDomains.get(`x-${xAxis.name}`);
      if (original) {
        axis.domain = original as [number | Date | string, number | Date | string] | string[];
      }
    }

    // Restore Y axes
    for (const yAxis of this.axes.y) {
      const axis = this.getAxis(yAxis);
      const original = this.originalDomains.get(`y-${yAxis.name}`);
      if (original) {
        axis.domain = original as [number | Date | string, number | Date | string] | string[];
      }
    }
  }

  destroy(): void {
    this.toolStateBusEndpoint.destroy();
  }
}
