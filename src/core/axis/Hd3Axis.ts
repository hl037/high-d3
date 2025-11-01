import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';

export interface Hd3AxisOptions {
  name: string;
  domain?: [number | Date | string, number | Date | string] | string[];
}

/**
 * Abstract axis that maintains only domain (not scale).
 * Implements Hd3Bus for domain change notifications.
 */
export class Hd3Axis {
  public name: string;
  private _domain: [number | Date | string, number | Date | string] | string[];
  private bus: Hd3Bus;

  constructor(options: Hd3AxisOptions) {
    this.name = options.name;
    this._domain = options.domain || [0, 1];
    this.bus = createHd3Bus();
  }

  get domain(): [number | Date | string, number | Date | string] | string[] {
    return this._domain;
  }

  set domain(value: [number | Date | string, number | Date | string] | string[]) {
    this._domain = value;
    this.bus.emit('domainChanged', value);
  }

  getBus(): Hd3Bus {
    return this.bus;
  }

  on(event: string, handler: (data?: unknown) => void): void {
    this.bus.on(event, handler);
  }

  off(event: string, handler: (data?: unknown) => void): void {
    this.bus.off(event, handler);
  }

  emit(event: string, data?: unknown): void {
    this.bus.emit(event, data);
  }
}
