 
import * as d3 from 'd3';

import type { Hd3Chart, Hd3ChartLayersI } from '../chart/Hd3Chart';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

export interface Hd3ForeignObjectAnchorOptions {
  bus?: Hd3Bus;
  layer?: (layers: Hd3ChartLayersI) => D3Group;
}

interface ChartData {
  foreignObject: d3.Selection<SVGForeignObjectElement, unknown, null, undefined>;
  container: HTMLDivElement;
}

export interface Hd3ForeignObjectAnchorContainer {
  chart: Hd3Chart;
  container: HTMLElement;
}

export interface Hd3ForeignObjectAnchorEvents {
  changed: void;
  destroyed: Hd3ForeignObjectAnchor;
}

export class Hd3ForeignObjectAnchor {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3ForeignObjectAnchorEvents>;
  private chartData: Map<Hd3Chart, ChartData>;
  private layerSelector: (layers: Hd3ChartLayersI) => D3Group;

  constructor(options: Hd3ForeignObjectAnchorOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.layerSelector = options.layer ?? (l => l.annotation.middle);

    this.e = {
      changed: createHd3Event<void>('foreignObjectAnchor.changed'),
      destroyed: createHd3Event<Hd3ForeignObjectAnchor>('foreignObjectAnchor.destroyed'),
    };
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) { return; }

    const layer = this.layerSelector(chart.layer);
    const foreignObject = layer.append('foreignObject')
      .attr('class', 'foreign-object-anchor')
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

    foreignObject.node()!.appendChild(container);

    const chartData: ChartData = {
      foreignObject,
      container,
    };

    this.chartData.set(chart, chartData);
    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.emit(this.e.changed, undefined);
  }

  public removeFromChart(chart: Hd3Chart) {
    const data = this.chartData.get(chart);
    if (!data) { return; }

    data.foreignObject.remove();
    this.bus.off(chart.e.destroyed, this.removeFromChart);
    this.chartData.delete(chart);
    this.bus.emit(this.e.changed, undefined);
  }

  public getContainer(chart: Hd3Chart): HTMLElement | undefined {
    return this.chartData.get(chart)?.container;
  }

  public getContainers(): Hd3ForeignObjectAnchorContainer[] {
    return [...this.chartData.entries()].map(([chart, chartData]) => ({
      chart,
      container: chartData.container,
    }));
  }

  destroy() {
    for (const chart of [...this.chartData.keys()]) {
      this.removeFromChart(chart);
    }
    this.bus.emit(this.e.destroyed, this);
  }
}
