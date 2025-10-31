import type { Hd3ToolState } from '../Hd3ToolState';
import type { Hd3XAxis } from '../../axis/Hd3XAxis';
import type { Hd3YAxis } from '../../axis/Hd3YAxis';

/**
 * Reset tool to restore original axis domains.
 */
export class Hd3ResetTool {
  private toolState: Hd3ToolState;
  private axes: { x: Hd3XAxis[]; y: Hd3YAxis[] };
  private originalDomains: Map<string, [number | Date | string, number | Date | string] | [number, number]>;

  constructor(
    toolState: Hd3ToolState,
    axes: { x: Hd3XAxis[]; y: Hd3YAxis[] }
  ) {
    this.toolState = toolState;
    this.axes = axes;
    this.originalDomains = new Map();

    // Store original domains
    for (const xAxis of axes.x) {
      this.originalDomains.set(`x-${xAxis.name}`, [...xAxis.domain]);
    }
    for (const yAxis of axes.y) {
      this.originalDomains.set(`y-${yAxis.name}`, [...yAxis.domain]);
    }

    this.toolState.on('toolChanged', (data: unknown) => {
      const change = data as { old: string; new: string };
      if (change.new === 'reset') {
        this.reset();
        // Reset tool state back to none
        setTimeout(() => {
          this.toolState.currentTool = 'none';
        }, 100);
      }
    });
  }

  reset(): void {
    // Restore X axes
    for (const xAxis of this.axes.x) {
      const original = this.originalDomains.get(`x-${xAxis.name}`);
      if (original) {
        xAxis.domain = original as [number | Date | string, number | Date | string];
      }
    }

    // Restore Y axes
    for (const yAxis of this.axes.y) {
      const original = this.originalDomains.get(`y-${yAxis.name}`);
      if (original) {
        yAxis.domain = original as [number, number];
      }
    }
  }
}
