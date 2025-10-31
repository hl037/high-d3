import * as d3 from 'd3';
import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';

export interface Hd3XAxisOptions {
  name: string;
  type?: 'linear' | 'time' | 'category';
  domain?: [number | Date | string, number | Date | string];
  range?: [number, number];
}

/**
 * Abstract X axis that maintains scale and domain.
 * Implements Hd3Bus for domain change notifications.
 */
export class Hd3XAxis {
  public name: string;
  public type: 'linear' | 'time' | 'category';
  private _domain: [number | Date | string, number | Date | string];
  private _range: [number, number];
  private _scale: d3.ScaleLinear<number, number> | d3.ScaleTime<number, number> | d3.ScalePoint<string>;
  private bus: Hd3Bus;

  constructor(options: Hd3XAxisOptions) {
    this.name = options.name;
    this.type = options.type || 'linear';
    this._domain = options.domain || [0, 1];
    this._range = options.range || [0, 100];
    this.bus = createHd3Bus();
    
    this._scale = this.createScale();
  }

  private createScale(): d3.ScaleLinear<number, number> | d3.ScaleTime<number, number> | d3.ScalePoint<string> {
    switch (this.type) {
      case 'time':
        return d3.scaleTime()
          .domain(this._domain as [Date, Date])
          .range(this._range);
      case 'category':
        return d3.scalePoint()
          .domain(this._domain as string[])
          .range(this._range);
      default:
        return d3.scaleLinear()
          .domain(this._domain as [number, number])
          .range(this._range);
    }
  }

  get scale(): d3.ScaleLinear<number, number> | d3.ScaleTime<number, number> | d3.ScalePoint<string> {
    return this._scale;
  }

  get domain(): [number | Date | string, number | Date | string] {
    return this._domain;
  }

  set domain(value: [number | Date | string, number | Date | string]) {
    this._domain = value;
    (this._scale as d3.ScaleLinear<number, number>).domain(value as [number, number]);
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
