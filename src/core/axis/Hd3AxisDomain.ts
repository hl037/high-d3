import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3EventNameMap } from '../bus/Hd3Bus';


export type Hd3AxisDomainEvents = {
  domainChanged: Iterable<d3.AxisDomain>
}

export interface Hd3AxisDomainOptions {
  bus?: Hd3Bus;
  domain?: Iterable<d3.AxisDomain>;
}

/**
 * Abstract axis domain that maintains only domain and range (not scale).
 */
export class Hd3AxisDomain {
  private _domain: Iterable<d3.AxisDomain>;
  private bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3AxisDomainEvents>;

  constructor(options: Hd3AxisDomainOptions) {
    this.bus = options.bus || getHd3GlobalBus();
    this._domain = options.domain || [0, 1];
    this.e = {
      domainChanged: createHd3Event<Iterable<d3.AxisDomain>>(`axis-domain.domainChanged`),
    }
  }

  get domain(): Iterable<d3.AxisDomain> {
    return this._domain;
  }

  set domain(value: Iterable<d3.AxisDomain>) {
    this._domain = value;
    this.bus.emit(this.e.domainChanged, value);
  }
}
