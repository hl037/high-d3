/* eslint-disable @typescript-eslint/no-explicit-any */
import * as d3 from 'd3';

import type { Hd3Chart } from '../chart/Hd3Chart';
import { getHd3GlobalBus, type Hd3Bus } from '../bus/Hd3Bus';
import { Hd3LegendData, Hd3LegendManagerChartEvents } from './Hd3LegendManager';

export interface Hd3ForeignObjectLegendOptions {
  bus?: Hd3Bus;
}

interface ChartData {
  foreignObject: d3.Selection<SVGForeignObjectElement, unknown, null, undefined>;
  container: HTMLDivElement;
  handleLegendChanged: (data: Hd3LegendData) => void;
  data: Hd3LegendData | null;
}

export interface Hd3ForeignObjectLegendContainer {
  chart: Hd3Chart;
  container: HTMLElement;
  data: Hd3LegendData | null;
}

/**
 * ForeignObject-based legend container for Vue Teleport / React Portal.
 */
export class Hd3ForeignObjectLegend {
  public readonly bus: Hd3Bus;
  private chartData: Map<Hd3Chart, ChartData>;

  constructor(options: Hd3ForeignObjectLegendOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    // Compensate for layer translation (margin top/left)
    const foreignObject = chart.layer.overlay.append('foreignObject')
      .attr('class', 'legend-foreign-object')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('x', -chart.margin.left)
      .attr('y', -chart.margin.top)
      .style('pointer-events', 'none')
      .style('overflow', 'visible');

    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';

    foreignObject.node()!.appendChild(container);

    const chartData: ChartData = {
      foreignObject,
      container,
      data: null,
      handleLegendChanged: (data: Hd3LegendData) => {
        chartData.data = data;
      },
    };

    this.chartData.set(chart, chartData);
    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.on(
      chart.e<Hd3LegendManagerChartEvents>()('legendChanged'),
      chartData.handleLegendChanged
    );
  }

  public removeFromChart(chart: Hd3Chart) {
    const data = this.chartData.get(chart);
    if (!data) return;

    data.foreignObject.remove();
    this.bus.off(chart.e.destroyed, this.removeFromChart);
    this.bus.off(
      chart.e<Hd3LegendManagerChartEvents>()('legendChanged'),
      data.handleLegendChanged
    );
    this.chartData.delete(chart);
  }

  /**
   * Iterate over all chart containers.
   */
  public forEachContainer(
    callback: (container: HTMLElement, chart: Hd3Chart, data: Hd3LegendData | null) => void
  ) {
    for (const [chart, chartData] of this.chartData) {
      callback(chartData.container, chart, chartData.data);
    }
  }

  /**
   * Get container for a specific chart.
   */
  public getContainer(chart: Hd3Chart): HTMLElement | undefined {
    return this.chartData.get(chart)?.container;
  }

  /**
   * Get legend data for a specific chart.
   */
  public getData(chart: Hd3Chart): Hd3LegendData | null | undefined {
    return this.chartData.get(chart)?.data;
  }

  /**
   * Get all containers as array.
   */
  public getContainers(): Hd3ForeignObjectLegendContainer[] {
    return [...this.chartData.entries()].map(([chart, chartData]) => ({
      chart,
      container: chartData.container,
      data: chartData.data,
    }));
  }

  destroy() {
    for (const chart of [...this.chartData.keys()]) {
      this.removeFromChart(chart);
    }
    (this as any).bus = undefined;
  }
}
