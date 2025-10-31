import * as d3 from 'd3';
import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';

export interface Hd3YAxisOptions {
  name: string;
  domain?: [number, number];
  range?: [number, number];
  logarithmic?: boolean;
  logBase?: number;
}

/**
 * Abstract Y axis that maintains scale and domain.
 * Supports linear and logarithmic scales.
 * Implements Hd3Bus for domain change notifications.
 */
export class Hd3YAxis {
  public name: string;
  public logarithmic: boolean;
  public logBase: number;
  private _domain: [number, number];
  private _range: [number, number];
  private _scale: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>;
  private bus: Hd3Bus;

  constructor(options: Hd3YAxisOptions) {
    this.name = options.name;
    this.logarithmic = options.logarithmic || false;
    this.logBase = options.logBase || 10;
    this._domain = options.domain || [0, 1];
    this._range = options.range || [100, 0];
    this.bus = createHd3Bus();
    
    this._scale = this.createScale();
  }

  private createScale(): d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number> {
    if (this.logarithmic) {
      const scale = d3.scaleLog()
        .base(this.logBase)
        .domain(this._domain)
        .range(this._range);
      return scale;
    } else {
      return d3.scaleLinear()
        .domain(this._domain)
        .range(this._range);
    }
  }

  get scale(): d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number> {
    return this._scale;
  }

  get domain(): [number, number] {
    return this._domain;
  }

  set domain(value: [number, number]) {
    this._domain = value;
    (this._scale as d3.ScaleLinear<number, number>).domain(value);
    this.bus.emit('domainChanged', value);
  }

  get range(): [number, number] {
    return this._range;
  }

  set range(value: [number, number]) {
    this._range = value;
    (this._scale as d3.ScaleLinear<number, number>).range(value);
    this.bus.emit('rangeChanged', value);
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
