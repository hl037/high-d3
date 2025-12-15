 
import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3EventNameMap } from '../bus/Hd3Bus';
import { MergingDict } from '../utils/MergingDict';
import { mergingDictProps } from '../utils/mergingDictProps';

export interface Hd3AxisDomainProps{
  rangeMinConstraints:{
    min?: number,
    max?: number,
  };
  rangeMaxConstraints:{
    min?: number,
    max?: number,
  }
}

export interface Hd3AxisDomainEvents {
  domainChanged: Iterable<d3.AxisDomain>;
  destroyed: Hd3AxisDomain;
}

export interface Hd3AxisDomainOptions {
  bus?: Hd3Bus;
  domain?: Iterable<d3.AxisDomain>;
  props?: Partial<Hd3AxisDomainProps>;
}

/**
 * Abstract axis domain that maintains only domain and range (not scale).
 */
export class Hd3AxisDomain {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3AxisDomainEvents>;
  public get props(): MergingDict<Hd3AxisDomainProps>{throw "init through mergingDictProps"};
  public set props(_:Partial<Hd3AxisDomainProps>){throw "init through mergingDictProps"};
  private _domain: d3.AxisDomain[];

  constructor(options: Hd3AxisDomainOptions) {
    this.bus = options.bus || getHd3GlobalBus();
    this._domain = options.domain ? [...options.domain] : [0, 1];
    this.e = {
      domainChanged: createHd3Event<Iterable<d3.AxisDomain>>(`axis-domain.domainChanged`),
      destroyed: createHd3Event<Hd3AxisDomain>('axis-domain.destroyed'),
    }
    mergingDictProps(
      this,
      options.props,
      {
        afterSet: () => {
          this.domain = this._domain;
        }
      }
    );
  }
  
  getDefaultProps(): Hd3AxisDomainProps{
    return {
      rangeMinConstraints: {
        
      },
      rangeMaxConstraints: {

      }
    }
  }

  get domain(): Iterable<d3.AxisDomain> {
    return this._domain;
  }

  set domain(value: Iterable<d3.AxisDomain>) {
    this._domain = [...value];
    if(this.props.rangeMinConstraints.min !== undefined && (this._domain[0] as number) < this.props.rangeMinConstraints.min) {
      this._domain[0] = this.props.rangeMinConstraints.min
    }
    if(this.props.rangeMinConstraints.max !== undefined && (this._domain[0] as number) > this.props.rangeMinConstraints.max) {
      this._domain[0] = this.props.rangeMinConstraints.max
    }
    if(this.props.rangeMaxConstraints.min !== undefined && (this._domain[1] as number) < this.props.rangeMaxConstraints.min) {
      this._domain[1] = this.props.rangeMaxConstraints.min
    }
    if(this.props.rangeMaxConstraints.max !== undefined && (this._domain[1] as number) > this.props.rangeMaxConstraints.max) {
      this._domain[1] = this.props.rangeMaxConstraints.max
    }
    this.bus.emit(this.e.domainChanged, this._domain);
  }

  destroy(){
    this.bus.emit(this.e.destroyed, this);
  }
}
