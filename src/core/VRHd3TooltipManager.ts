import { Hd3Chart, Hd3TooltipManager, Hd3TooltipManagerOptions } from "../core";
import { Hd3ForeignObjectTooltip } from "../core/tooltip/Hd3ForeignObjectTooltip";

export class VRHd3TooltipManager{
  public readonly manager: Hd3TooltipManager;
  public readonly foTooltip: Hd3ForeignObjectTooltip;

  constructor(opts?: Hd3TooltipManagerOptions){
    this.manager = new Hd3TooltipManager(opts);
    this.foTooltip = new Hd3ForeignObjectTooltip({});
  }

  public addToChart(chart: Hd3Chart){
    this.manager.addToChart(chart);
    this.foTooltip.addToChart(chart);
  }

  public removeFromChart(chart: Hd3Chart){
    this.manager.removeFromChart(chart);
    this.foTooltip.removeFromChart(chart);
  }

  destroy(){
    this.manager.destroy();
    this.foTooltip.destroy();
  }
}

export function vrHd3TooltipManager(opts?: Hd3TooltipManagerOptions){
  return new VRHd3TooltipManager(opts);
}
