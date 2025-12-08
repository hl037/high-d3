import mitt from "mitt";
import { App, inject, InjectionKey } from "vue";

import { Hd3RenderManager } from "@/core";
import { Hd3Bus, setHd3GlobalBusProvider } from "..//core/bus/Hd3Bus";

export * as VHd3Chart from "./VHd3Chart.vue";
export * as VHd3Tooltip from "./VHd3Tooltip.vue";
export * as VHd3Legend from "./VHd3Legend.vue";
export * as VHd3ForeignObject from "./VHd3ForeignObject.vue";
export { VRHd3TooltipManager } from "../core/VRHd3TooltipManager"
export { VRHd3LegendManager } from "../core/VRHd3LegendManager"

export const vhd3BusSymbol:InjectionKey<Hd3Bus> = Symbol('VHd3Bus')

let initialized = false;

function vhd3GlobalBusProvider(){
  try{
    return useVHd3GlobalBus()
  }
  catch(e){
    throw new Error('with vue, use useVHd3GlobalBus instead, and create all your objects in the setup. If you need to create outside the setup, then store a reference to the bus from useVHd3GlobalBus(), anss it explicitely');
  }
}

export function useVHd3GlobalBus(){
  return inject(vhd3BusSymbol)!;
}


export const VHd3Plugin = {
  install(app:App) {
    if(!initialized) {
      initialized = true;
      setHd3GlobalBusProvider(vhd3GlobalBusProvider);
    }
    const bus = mitt() as Hd3Bus
    app.provide(vhd3BusSymbol, bus);
    new Hd3RenderManager({bus})
  }
}
