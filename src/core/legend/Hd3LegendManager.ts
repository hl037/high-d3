/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Hd3Chart } from '../chart/Hd3Chart';
import type { Hd3SeriesRenderer } from '../series/Hd3SeriesRenderer';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';
import { Hd3SeriesRendererManager, Hd3SeriesRendererManagerEvents } from '../managers/Hd3SeriesRenderManager';

export interface LegendSeriesData {
  renderer: Hd3SeriesRenderer;
  color: string;
  visible: boolean;
}

export interface Hd3LegendData {
  series: LegendSeriesData[];
}

export interface Hd3LegendManagerChartEvents {
  legendChanged: Hd3LegendData;
}

export interface Hd3LegendManagerEvents {
  changed: Hd3LegendData;
  destroyed: Hd3LegendManager;
}

export interface Hd3LegendManagerOptions {
  bus?: Hd3Bus;
  series?: (Hd3SeriesRenderer | string)[];
}

interface ChartData {
  handleSeriesListChanged: (renderers: Hd3SeriesRenderer[]) => void;
  rendererCleanups: Map<Hd3SeriesRenderer, () => void>;
}

/**
 * Legend manager that emits legendChanged events with series data.
 */
export class Hd3LegendManager {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3LegendManagerEvents>;
  private chartData: Map<Hd3Chart, ChartData>;
  private seriesFilter?: Set<string>;

  constructor(options: Hd3LegendManagerOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.seriesFilter = options.series && new Set(
      options.series.map(r => typeof r === 'string' ? r : r.name)
    );

    this.e = {
      changed: createHd3Event<Hd3LegendData>('legendManager.changed'),
      destroyed: createHd3Event<Hd3LegendManager>('legendManager.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    const chartData: ChartData = {
      handleSeriesListChanged: (renderers: Hd3SeriesRenderer[]) => {
        this.updateRendererSubscriptions(chart, chartData, renderers);
        this.emitLegendChanged(chart);
      },
      rendererCleanups: new Map(),
    };

    this.chartData.set(chart, chartData);

    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.on(
      chart.e<Hd3SeriesRendererManagerEvents>()('seriesRendererListChanged'),
      chartData.handleSeriesListChanged
    );

    // Get initial series list
    this.bus.emit(
      chart.e<Hd3SeriesRendererManagerEvents>()('getSeriesRendererManager'),
      (manager: Hd3SeriesRendererManager) => {
        chartData.handleSeriesListChanged(manager.getSeries());
      }
    );
  }

  public removeFromChart(chart: Hd3Chart) {
    const chartData = this.chartData.get(chart);
    if (!chartData) return;

    // Cleanup all renderer subscriptions
    for (const cleanup of chartData.rendererCleanups.values()) {
      cleanup();
    }
    chartData.rendererCleanups.clear();

    this.bus.off(
      chart.e<Hd3SeriesRendererManagerEvents>()('seriesRendererListChanged'),
      chartData.handleSeriesListChanged
    );
    this.bus.off(chart.e.destroyed, this.removeFromChart);

    this.chartData.delete(chart);
  }

  private updateRendererSubscriptions(
    chart: Hd3Chart,
    chartData: ChartData,
    renderers: Hd3SeriesRenderer[]
  ) {
    const currentRenderers = new Set(renderers);

    // Remove subscriptions for renderers no longer present
    for (const [renderer, cleanup] of chartData.rendererCleanups) {
      if (!currentRenderers.has(renderer)) {
        cleanup();
        chartData.rendererCleanups.delete(renderer);
      }
    }

    // Add subscriptions for new renderers
    for (const renderer of renderers) {
      if (!chartData.rendererCleanups.has(renderer)) {
        const handleVisibilityChanged = () => this.emitLegendChanged(chart);
        this.bus.on(renderer.e.visibilityChanged, handleVisibilityChanged);

        const handleDestroyed = () => {
          const cleanup = chartData.rendererCleanups.get(renderer);
          if (cleanup) {
            cleanup();
            chartData.rendererCleanups.delete(renderer);
          }
        };
        this.bus.on(renderer.e.destroyed, handleDestroyed);

        chartData.rendererCleanups.set(renderer, () => {
          this.bus.off(renderer.e.visibilityChanged, handleVisibilityChanged);
          this.bus.off(renderer.e.destroyed, handleDestroyed);
        });
      }
    }
  }

  private emitLegendChanged(chart: Hd3Chart) {
    const legendData = this.buildLegendData(chart);
    this.bus.emit(chart.e<Hd3LegendManagerChartEvents>()('legendChanged'), legendData);
    this.bus.emit(this.e.changed, legendData);
  }

  private buildLegendData(chart: Hd3Chart): Hd3LegendData {
    const series: LegendSeriesData[] = [];

    this.bus.emit(
      chart.e<Hd3SeriesRendererManagerEvents>()('getSeriesRendererManager'),
      (manager: Hd3SeriesRendererManager) => {
        let renderers = manager.getSeries();
        if (this.seriesFilter) {
          renderers = renderers.filter(r => this.seriesFilter!.has(r.name));
        }
        for (const renderer of renderers) {
          series.push({
            renderer,
            color: renderer.color || '#steelblue',
            visible: renderer.visible,
          });
        }
      }
    );

    return { series };
  }

  /**
   * Force emit legendChanged for a chart (useful when adding legend after chart setup)
   */
  public refresh(chart: Hd3Chart) {
    if (this.chartData.has(chart)) {
      this.emitLegendChanged(chart);
    }
  }

  destroy() {
    for (const chart of [...this.chartData.keys()]) {
      this.removeFromChart(chart);
    }
    this.bus.emit(this.e.destroyed, this);
    (this as any).seriesFilter = null;
    (this as any).chartData = null;
  }
}
