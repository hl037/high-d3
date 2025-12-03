/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hd3AxisDomain } from "../axis/Hd3AxisDomain";
import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3EventNameMap } from "../bus/Hd3Bus";
import { Hd3Series } from "./Hd3Series";

export interface Hd3AutoDomainEvents{
  destroyed: Hd3AutoDomain
}

interface Hd3AutoDomainMapping{
  series: Hd3Series,
  seriesComponent: number,
  axisDomain: Hd3AxisDomain,
}

interface SeriesData{
  ranges: d3.AxisDomain[][];
  mappings: Set<Hd3AutoDomainMapping>;
}

interface AxisDomainData{
  domain: d3.AxisDomain[];
  mappings: Set<Hd3AutoDomainMapping>;
}

export interface Hd3AutoDomainOptions {
  bus?: Hd3Bus;
  active?: boolean;
}

export class Hd3AutoDomain{
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3AutoDomainEvents>;
  protected seriesData: Map<Hd3Series, SeriesData>;
  protected axisDomainData: Map<Hd3AxisDomain, AxisDomainData>;
  protected _active: boolean;

  constructor(options?: Partial<Hd3AutoDomainOptions>){
    this.unlinkSeries = this.unlinkSeries.bind(this);
    this.unlinkAxisDomain = this.unlinkAxisDomain.bind(this);
    this.handleSeriesDataChanged = this.handleSeriesDataChanged.bind(this);

    this.bus = options?.bus || getHd3GlobalBus();
    this.seriesData = new Map();
    this.axisDomainData = new Map();
    this._active = options?.active ?? true;

    this.e = {
      destroyed: createHd3Event<Hd3AutoDomain>('auto-domain.destroyed'),
    }
  }

  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    this._active = value;
    if (value) {
      this.apply();
    }
  }

  apply(axisDomains?: Hd3AxisDomain | Hd3AxisDomain[]): void {
    const targets = axisDomains
      ? (Array.isArray(axisDomains) ? axisDomains : [axisDomains])
      : [...this.axisDomainData.keys()];

    for (const axisDomain of targets) {
      const data = this.axisDomainData.get(axisDomain);
      if (data && data.domain.length > 0) {
        axisDomain.domain = data.domain;
      }
    }
  }

  linkSeries(series:Hd3Series, mapping:(Hd3AxisDomain | undefined | null)[]){
    const mappings = mapping.map((axisDomain, seriesComponent) => (
      axisDomain ?
      {
        series,
        seriesComponent,
        axisDomain,
      } :
      undefined
    )).filter((e) => e !== undefined);
    let seriesData = this.seriesData.get(series)
    if(!seriesData) {
      seriesData = {
        ranges: [],
        mappings: new Set(),
      }
      this.seriesData.set(series, seriesData);
      this.bus.on(series.e.destroyed, this.unlinkSeries);
      this.bus.on(series.e.dataChanged, this.handleSeriesDataChanged);
    }
    for(const m of mappings){
      let axisDomainData = this.axisDomainData.get(m.axisDomain)
      if(!axisDomainData) {
        axisDomainData = {
          domain: [],
          mappings: new Set(),
        };
        this.axisDomainData.set(m.axisDomain, axisDomainData);
        this.bus.on(m.axisDomain.e.destroyed, this.unlinkAxisDomain);
      }
      seriesData.mappings.add(m);
      axisDomainData.mappings.add(m);
    }
    this.handleSeriesDataChanged(series);
  }

  unlinkSeries(series:Hd3Series){
    const seriesData = this.seriesData.get(series);
    if(seriesData === undefined) {
      return;
    }
    for(const m of seriesData.mappings){
      const axisDomainData = this.axisDomainData.get(m.axisDomain);
      if(axisDomainData === undefined) {
        throw new Error('Corruption in Hd3AutoDomain');
      }
      axisDomainData.mappings.delete(m);
      if(axisDomainData.mappings.size === 0) {
        this.axisDomainData.delete(m.axisDomain)
        this.bus.off(m.axisDomain.e.destroyed, this.unlinkAxisDomain);
      }
    }
    this.seriesData.delete(series);
    this.bus.off(series.e.destroyed, this.unlinkSeries);
    this.bus.off(series.e.dataChanged, this.handleSeriesDataChanged);
  }

  unlinkAxisDomain(axisDomain: Hd3AxisDomain){
    const axisDomainData = this.axisDomainData.get(axisDomain);
    if(axisDomainData === undefined) {
      return;
    }
    for(const m of axisDomainData.mappings){
      const seriesData = this.seriesData.get(m.series);
      if(seriesData === undefined) {
        throw new Error('Corruption in Hd3AutoDomain');
      }
      seriesData.mappings.delete(m);
      if(seriesData.mappings.size === 0) {
        this.seriesData.delete(m.series)
        this.bus.off(m.series.e.destroyed, this.unlinkSeries);
        this.bus.off(m.series.e.dataChanged, this.handleSeriesDataChanged);
      }
    }
    this.axisDomainData.delete(axisDomain);
    this.bus.off(axisDomain.e.destroyed, this.unlinkAxisDomain);
  }

  handleSeriesDataChanged(series: Hd3Series){
    const seriesData = this.seriesData.get(series)
    const updatedAxisDomains = new Set<Hd3AxisDomain>();

    for(const m of seriesData?.mappings ?? []){
      const ind = m.seriesComponent;
      // Compute new series range
      const range = seriesData!.ranges[ind] = [undefined, undefined] as unknown as [d3.AxisDomain, d3.AxisDomain];
      for(const r of series.data){
        const v = r[ind];
        if(!(v >= range[0])) {
          range[0] = v;
        }
        if(!(v <= range[1])){
          range[1] = v;
        }
      }
      updatedAxisDomains.add(m.axisDomain);
    }

    // Update cached domains for each affected axisDomain
    for (const axisDomain of updatedAxisDomains) {
      const axisDomainData = this.axisDomainData.get(axisDomain)!;
      const newDomain: d3.AxisDomain[] = [undefined, undefined] as unknown as d3.AxisDomain[];

      for (const m2 of axisDomainData.mappings) {
        const seriesData2 = this.seriesData.get(m2.series)!;
        const range2 = seriesData2.ranges[m2.seriesComponent];
        if (range2) {
          if (!(newDomain[0] <= range2[0])) {
            newDomain[0] = range2[0];
          }
          if (!(newDomain[1] >= range2[1])) {
            newDomain[1] = range2[1];
          }
        }
      }

      axisDomainData.domain = newDomain;

      if (this._active) {
        axisDomain.domain = newDomain;
      }
    }
  }

  destroy(){
    for(const series of this.seriesData.keys()){
      this.unlinkSeries(series);
    }
    this.bus.emit(this.e.destroyed, this);
    (this as any).seriesData = undefined;
    (this as any).axisDomainData = undefined;
    (this as any).bus = undefined;
  }
}
