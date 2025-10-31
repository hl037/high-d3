import { Hd3Chart } from '../chart/Hd3Chart';
import { Hd3Series } from '../series/Hd3Series';

/**
 * Manager that keeps track of series added to the chart.
 * Caches series and initializes objects that need series list.
 */
export class Hd3SeriesManager {
  private chart: Hd3Chart;
  private series: Map<string, Hd3Series> = new Map();

  constructor(chart: Hd3Chart) {
    this.chart = chart;
    this.chart.on('addSeries', this.handleAddSeries.bind(this));
    this.chart.on('removeSeries', this.handleRemoveSeries.bind(this));
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

  getSeries(): Hd3Series[] {
    return Array.from(this.series.values());
  }

  getSeriesByName(name: string): Hd3Series | undefined {
    return this.series.get(name);
  }

  destroy(): void {
    this.series.clear();
  }
}
