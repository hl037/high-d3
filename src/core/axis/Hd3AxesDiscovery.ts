import { getHd3GlobalBus, type Hd3Bus, type Hd3DynamicEventNameMapProvider } from '../bus/Hd3Bus';
import type { Hd3Axis } from './Hd3Axis';
import type { Hd3AxisManager } from '../managers/Hd3AxisManager';

export interface Hd3AxesDiscoveryOptions {
  bus?: Hd3Bus;
  charts?: Hd3DynamicEventNameMapProvider[];
  axes?: (Hd3Axis | string)[];
}

export class Hd3AxesDiscovery {
  public readonly bus: Hd3Bus;
  private axesSpec: (Hd3Axis | string)[] | undefined;
  private resolvedAxes: Hd3Axis[];
  private namedAxes: string[];
  private discoveredManagers: Hd3AxisManager[];

  constructor(options: Hd3AxesDiscoveryOptions) {
    this.bus = options.bus || getHd3GlobalBus();
    this.axesSpec = options.axes;
    this.resolvedAxes = [];
    this.namedAxes = [];
    this.discoveredManagers = [];

    if (!this.axesSpec) {
      return;
    }

    for (const spec of this.axesSpec) {
      if (typeof spec === 'string') {
        this.namedAxes.push(spec);
      } else {
        this.resolvedAxes.push(spec);
      }
    }

    for (const chart of options.charts ?? []) {
      this.bus.on(chart.e<Hd3AxisManagerEvents>(
      const endpoint = new Hd3BusEndpoint({
        listeners: {
          addAxisManager: (manager: unknown) => {
            this.handleAddAxisManager(manager as Hd3AxisManager);
          },
          removeAxisManager: (manager: unknown) => {
            this.handleRemoveAxisManager(manager as Hd3AxisManager);
          }
        }
      });
      endpoint.bus = bus;
      this.busEndpoints.push(endpoint);

      bus.emit('getAxisManager', this);
    }
  }

  setAxisManager(manager: Hd3AxisManager): void {
    if (!this.discoveredManagers.includes(manager)) {
      this.discoveredManagers.push(manager);
    }
  }

  private handleAddAxisManager(manager: Hd3AxisManager): void {
    // Refresh the manager reference
    const index = this.discoveredManagers.findIndex(m => m === manager);
    if (index < 0) {
      this.discoveredManagers.push(manager);
    }
  }
  
  private handleRemoveAxisManager(manager: Hd3AxisManager): void {
    // Refresh the manager reference
    const index = this.discoveredManagers.findIndex(m => m === manager);
    if (index >= 0) {
      this.discoveredManagers.splice(index, 1);
    }
  }

  getAxes(): Hd3Axis[] {
    const result = [...this.resolvedAxes];

    for (const name of this.namedAxes) {
      for (const manager of this.discoveredManagers) {
        const axis = manager.getXAxis(name) || manager.getYAxis(name);
        if (axis && !result.includes(axis)) {
          result.push(axis);
          break;
        }
      }
    }

    return result;
  }

  destroy(): void {
    for (const endpoint of this.busEndpoints) {
      endpoint.destroy();
    }
    this.busEndpoints = [];
    this.discoveredManagers = [];
  }
}
