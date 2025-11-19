import { getHd3GlobalBus, type Hd3Bus, type Hd3DynamicEventNameMapProvider } from '../bus/Hd3Bus';
import type { Hd3Axis } from './Hd3Axis';
import type { Hd3AxisManager, Hd3AxisManagerChangedEvent, Hd3AxisManagerEvents } from '../managers/Hd3AxisManager';

export interface Hd3AxesDiscoveryOptions {
  bus?: Hd3Bus;
  charts?: Hd3DynamicEventNameMapProvider[];
  axes?: (Hd3Axis | string)[];
  all?: boolean
}

// This class is a store for Axes. It is used to subscribe to axis manager
export class Hd3AxesDiscovery {
  public readonly bus: Hd3Bus;
  private axesSpec: (Hd3Axis | string)[] | undefined;
  private staticAxes: Hd3Axis[];
  private namedAxes: string[];
  private discoveredManagers: Map<Hd3DynamicEventNameMapProvider, Hd3AxisManager|null>;
  private all: boolean;

  constructor(options: Hd3AxesDiscoveryOptions) {
    this.handleAxisManagerChanged = this.handleAxisManagerChanged.bind(this);
    this.handleAxisDestroyed = this.handleAxisDestroyed.bind(this);
    this.bus = options.bus || getHd3GlobalBus();
    this.axesSpec = options.axes;
    this.staticAxes = [];
    this.namedAxes = [];
    this.discoveredManagers = new Map();
    this.all = !!options.all;

    if (!this.axesSpec) {
      return;
    }

    for (const spec of this.axesSpec) {
      if (typeof spec === 'string') {
        this.namedAxes.push(spec);
      } else {
        this.staticAxes.push(spec);
        this.bus.on(spec.e.destroyed, this.handleAxisDestroyed)
      }
    }

    for (const chart of options.charts ?? []) {
      this.bus.on(chart.e<Hd3AxisManagerEvents>()('axisManagerChanged'), this.handleAxisManagerChanged)
    }
  }

  setAxisManager(manager: Hd3AxisManager): void {
    this.discoveredManagers.set(manager.chart, manager);
  }

  private handleAxisManagerChanged({provider, axisManager}: Hd3AxisManagerChangedEvent){
    {
      this.discoveredManagers.set(provider, axisManager);
    }
  }

  private handleAxisDestroyed(axis: Hd3Axis){
    const ind = this.staticAxes.findIndex((e) => e === axis);
    if(ind >= 0) {
      this.staticAxes.splice(ind, 1)
      this.bus.off(axis.e.destroyed, this.handleAxisDestroyed);
    }
  }

  getAxes(): Hd3Axis[] {
    const result = [...this.staticAxes];

    if(this.all) {
      for (const manager of this.discoveredManagers.values()) {
        if(manager === null) {
          continue;
        }
        result.push(...manager.getXAxes(), ...manager.getYAxes());
      }
      return result;
    }

    for (const name of this.namedAxes) {
      for (const manager of this.discoveredManagers.values()) {
        if(manager === null) {
          continue;
        }
        const axis = manager.getXAxis(name) || manager.getYAxis(name);
        if (axis && !result.includes(axis)) {
          result.push(axis);
          break;
        }
      }
    }
    return result;
  }

  getXAxes(): Hd3Axis[]{
    const result = this.staticAxes.filter((axis => axis.orientation === 'x'));

    if(this.all) {
      for (const manager of this.discoveredManagers.values()) {
        if(manager === null) {
          continue;
        }
        result.push(...manager.getXAxes());
      }
      return result;
    }

    for (const name of this.namedAxes) {
      for (const manager of this.discoveredManagers.values()) {
        if(manager === null) {
          continue;
        }
        const axis = manager.getXAxis(name);
        if (axis && !result.includes(axis)) {
          result.push(axis);
          break;
        }
      }
    }
    return result;
  }
  
  getYAxes(): Hd3Axis[]{
    const result = this.staticAxes.filter((axis => axis.orientation === 'x'));

    if(this.all) {
      for (const manager of this.discoveredManagers.values()) {
        if(manager === null) {
          continue;
        }
        result.push(...manager.getYAxes());
      }
      return result;
    }

    for (const name of this.namedAxes) {
      for (const manager of this.discoveredManagers.values()) {
        if(manager === null) {
          continue;
        }
        const axis = manager.getYAxis(name);
        if (axis && !result.includes(axis)) {
          result.push(axis);
          break;
        }
      }
    }
    return result;
  }

  destroy(): void {
    for(const chart of this.discoveredManagers.keys()){
      this.bus.off(chart.e<Hd3AxisManagerEvents>()('axisManagerChanged'), this.handleAxisManagerChanged)
    }
    for(const axis of this.staticAxes){
      this.bus.off(axis.e.destroyed, this.handleAxisDestroyed);
    }
    (this as any).staticAxes = undefined;
    (this as any).discoveredManagers = undefined;
  }
}
