import { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from '../series/Hd3Series';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import type { SeriesState, GetSeriesCallback } from './managerInterfaces';

/**
 * Manager that keeps track of series added to the chart.
 * Caches series and initializes objects that need series list.
 */
export class Hd3SeriesManager {
  private chart: Hd3Chart;
  private series: Map<string, Hd3Series> = new Map();
  private chartBusEndpoint: Hd3BusEndpoint;

  constructor(chart: Hd3Chart) {
    this.chart = chart;
    
    // Connect to chart bus
    this.chartBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        addSeries: (series: unknown) => this.handleAddSeries(series),
        removeSeries: (series: unknown) => this.handleRemoveSeries(series),
        getSeries: (callback: unknown) => this.handleGetSeries(callback)
      }
    });
    this.chartBusEndpoint.bus = this.chart.getBus();
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

  private handleGetSeries(callback: unknown): void {
    if (callback && typeof callback === 'object' && 'setSeries' in callback) {
      const cb = callback as GetSeriesCallback;
      cb.setSeries({ series: this.getSeries() });
    }
  }

  getSeries(): Hd3Series[] {
    return Array.from(this.series.values());
  }

  getSeriesByName(name: string): Hd3Series | undefined {
    return this.series.get(name);
  }

  destroy(): void {
    this.chartBusEndpoint.destroy();
    this.series.clear();
  }
}
