import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';
import type { SeriesData, Data2D } from '../types';
import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';

export interface Hd3SeriesOptions<T extends number | string | Date = number> {
  name: string;
  data: SeriesData<T>;
  xAxis?: Hd3XAxis | string;
  yAxis?: Hd3YAxis | string;
}

/**
 * Series data container. Implements Hd3Bus for change notifications.
 * Normalizes various data formats to Data2D.
 */
export class Hd3Series<T extends number | string | Date = number> {
  public name: string;
  private _data: Data2D<T>;
  private bus: Hd3Bus;
  public xAxis?: Hd3XAxis | string;
  public yAxis?: Hd3YAxis | string;
  public visible: boolean = true;

  constructor(options: Hd3SeriesOptions<T>) {
    this.name = options.name;
    this._data = this.normalizeData(options.data);
    this.xAxis = options.xAxis;
    this.yAxis = options.yAxis;
    this.bus = createHd3Bus();
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
    this.bus.emit('dataChanged', this._data);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.bus.emit('visibilityChanged', visible);
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
