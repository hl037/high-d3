import type { Hd3Chart } from './chart/Hd3Chart';
import { Hd3LegendManager, Hd3LegendManagerOptions } from './legend/Hd3LegendManager';
import { Hd3ForeignObjectLegend } from './legend/Hd3ForeignObjectLegend';

export class VRHd3LegendManager {
  public readonly manager: Hd3LegendManager;
  public readonly foLegend: Hd3ForeignObjectLegend;

  constructor(opts?: Hd3LegendManagerOptions) {
    this.manager = new Hd3LegendManager(opts);
    this.foLegend = new Hd3ForeignObjectLegend({});
  }

  public addToChart(chart: Hd3Chart) {
    this.manager.addToChart(chart);
    this.foLegend.addToChart(chart);
    // Trigger initial legendChanged after foLegend is ready
    this.manager.refresh(chart);
  }

  public removeFromChart(chart: Hd3Chart) {
    this.manager.removeFromChart(chart);
    this.foLegend.removeFromChart(chart);
  }

  destroy() {
    this.manager.destroy();
    this.foLegend.destroy();
  }
}

export function vrHd3LegendManager(opts?: Hd3LegendManagerOptions) {
  return new VRHd3LegendManager(opts);
}
