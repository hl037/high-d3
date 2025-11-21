import { createHd3Event, getHd3GlobalBus, Hd3Bus, Hd3EventNameMap } from '../bus/Hd3Bus';
import type { SeriesData, Data2D } from '../types';

export interface Hd3SeriesEvents {
  dataChanged: SeriesData<any>;
  destroyed: Hd3Series<number|string|Date>
}

export interface Hd3SeriesOptions<T extends number | string | Date = number> {
  bus?: Hd3Bus;
  name: string;
  data: SeriesData<T>;
}

/**
 * Series data container. Implements Hd3Bus for change notifications.
 * Normalizes various data formats to Data2D.
 */
export class Hd3Series<T extends number | string | Date = number> {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3SeriesEvents>;
  public readonly name: string;
  private _data: Data2D<T>;
  public visible: boolean = true;

  constructor(options: Hd3SeriesOptions<T>) {

    this.bus = options.bus || getHd3GlobalBus();
    this.name = options.name;
    this._data = this.normalizeData(options.data);
    this.e = {
      dataChanged:createHd3Event<SeriesData<string> | SeriesData<number> | SeriesData<Date>>(`series[${this.name}].dataChanged`),
      destroyed:createHd3Event<Hd3Series>(`series[${this.name}].destroyed`),
    }
  }

  private normalizeData(data: SeriesData<T>): Data2D<T> {
    if (Array.isArray(data) && data.length > 0) {
      if (Array.isArray(data[0])) {
        return data as Data2D<T>;
      } else if (typeof data[0] === 'object' && 'x' in data[0] && 'y' in data[0]) {
        return (data as { x: T; y: number }[]).map(d => [d.x, d.y]);
      } else {
        // Data1D - use index as x
        return (data as number[]).map((y, i) => [i as T, y]);
      }
    }
    return [];
  }

  get data(): Data2D<T> {
    return this._data;
  }

  set data(value: SeriesData<T>) {
    this._data = this.normalizeData(value);
    this.bus.emit(this.e.dataChanged, this._data);
  }

  destroy(){
    this.bus.emit(this.e.destroyed, this);
  }
}
