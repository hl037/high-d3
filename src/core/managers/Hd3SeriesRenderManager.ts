import { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from '../series/Hd3Series';
import { Hd3SeriesRenderer } from '../series/Hd3SeriesRenderer';

interface GetSeriesManagerCallbackI {(m:Hd3SeriesRendererManager):void}

export type Hd3SeriesRendererManagerEvents = {
  addSeriesRenderer: Hd3SeriesRenderer,
  removeSeriesRenderer: Hd3SeriesRenderer,
  getSeriesRendererManager: GetSeriesManagerCallbackI,
  seriesRendererListChanged: Hd3SeriesRenderer[],
  seriesRendererManagerChanged: Hd3SeriesRendererManager | undefined,
}

/**
 * Manager that keeps track of series added to the chart.
 * Caches series and initializes objects that need series list.
 */
export class Hd3SeriesRendererManager {
  private chart: Hd3Chart;
  private series: Map<string, Hd3SeriesRenderer> = new Map();

  constructor(chart: Hd3Chart) {
    this.chart = chart;

    const bus = this.chart.bus;

    bus.on(chart.e<Hd3SeriesRendererManagerEvents>()('addSeriesRenderer'), this.handleAddSeries.bind(this));
    bus.on(chart.e<Hd3SeriesRendererManagerEvents>()('removeSeriesRenderer'), this.handleRemoveSeries.bind(this));
    bus.on(chart.e<Hd3SeriesRendererManagerEvents>()('getSeriesRendererManager'), this.handleGetSeriesManager.bind(this));
    bus.on(chart.e.destroyed, this.destroy.bind(this))

    // Announce manager on the bus
    bus.emit(chart.e<Hd3SeriesRendererManagerEvents>()('seriesRendererManagerChanged'), this);
  }

  private handleAddSeries(series: Hd3SeriesRenderer): void {
    this.series.set(series.name, series);
    this.chart.bus.emit(this.chart.e<Hd3SeriesRendererManagerEvents>()('seriesRendererListChanged'), this.getSeries());
  }

  private handleRemoveSeries(series: Hd3SeriesRenderer): void {
    this.series.delete(series.name);
    this.chart.bus.emit(this.chart.e<Hd3SeriesRendererManagerEvents>()('seriesRendererListChanged'), this.getSeries());
  }

  private handleGetSeriesManager(cb: GetSeriesManagerCallbackI): void {
    cb(this);
  }

  getSeries(): Hd3SeriesRenderer[] {
    return [...this.series.values()];
  }

  getSeriesByName(name: string): Hd3SeriesRenderer | undefined {
    return this.series.get(name);
  }

  destroy(): void {
    this.chart.bus.emit(this.chart.e<Hd3SeriesRendererManagerEvents>()('seriesRendererManagerChanged'), undefined);
    (this as any).chart = undefined;
    (this as any).series  = undefined;
  }
}
