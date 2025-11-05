import { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from '../series/Hd3Series';
import { getHd3GlobalBus } from '../bus/Hd3Bus';

interface GetSeriesManagerCallbackI {setSeriesManager:(m:Hd3SeriesManager)=>void}

export type Hd3SeriesManagerEvents = {
  addSeries: Hd3Series,
  removeSeries: Hd3Series,
  getSeriesManager: GetSeriesManagerCallbackI,
  seriesManagerChanged: Hd3SeriesManager | undefined,
}

/**
 * Manager that keeps track of series added to the chart.
 * Caches series and initializes objects that need series list.
 */
export class Hd3SeriesManager {
  private chart: Hd3Chart;
  private series: Map<string, Hd3Series> = new Map();

  constructor(chart: Hd3Chart) {
    this.chart = chart;

    const bus = getHd3GlobalBus();

    bus.on(chart.e.get<Hd3SeriesManagerEvents>('addSeries'), this.handleAddSeries.bind(this));
    bus.on(chart.e.get<Hd3SeriesManagerEvents>('removeSeries'), this.handleRemoveSeries.bind(this));
    bus.on(chart.e.get<Hd3SeriesManagerEvents>('getSeriesManager'), this.handleGetSeriesManager.bind(this));
    bus.on(chart.e.destroyed, this.destroy.bind(this))

    // Announce manager on the bus
    bus.emit(chart.e.get<Hd3SeriesManagerEvents>('seriesManagerChanged'), this);
  }

  private handleAddSeries(series: unknown): void {
    if (series instanceof Hd3Series) {
      this.series.set(series.name, series);
      this.chart.emit('seriesListChanged', this.getSeries());
    }
  }

  private handleRemoveSeries(series: unknown): void {
    if (series instanceof Hd3Series) {
      this.series.delete(series.name);
      this.chart.emit('seriesListChanged', this.getSeries());
    }
  }

  private handleGetSeriesManager(cb: GetSeriesManagerCallbackI): void {
    cb.setSeriesManager(this);
  }

  getSeries(): Hd3Series[] {
    return Array.from(this.series.values());
  }

  getSeriesByName(name: string): Hd3Series | undefined {
    return this.series.get(name);
  }

  destroy(): void {
    const bus = getHd3GlobalBus();
    bus.emit(this.chart.e.get<Hd3SeriesManagerEvents>('seriesManagerChanged'), undefined);
    (this as any).chart = undefined;
    (this as any).series  = undefined;
  }
}
