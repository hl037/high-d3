import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { getHd3GlobalBus, type Hd3Bus } from '../bus/Hd3Bus';
import { Hd3TooltipData as Hd3TooltipData, Hd3TooltipManagerChartEvents } from './Hd3TooltipManager';

export interface Hd3ForeignObjectTooltipOptions {
  bus?: Hd3Bus;
  offsetX?: number;
  offsetY?: number;
}

interface ChartData {
  foreignObject: d3.Selection<SVGForeignObjectElement, unknown, null, undefined>;
  container: HTMLDivElement;
  handleShow: (data: Hd3TooltipData) => void;
  handleHide: () => void;
  data: Hd3TooltipData | null;
}

export interface Hd3ForeignObjectTooltipContainer {
  chart: Hd3Chart;
  container: HTMLElement;
  data: Hd3TooltipData | null;
}

/**
 * ForeignObject-based tooltip container for Vue Teleport.
 */
export class Hd3ForeignObjectTooltip {
  public readonly bus: Hd3Bus;
  private chartData: Map<Hd3Chart, ChartData>;
  private offsetX: number;
  private offsetY: number;

  constructor(options: Hd3ForeignObjectTooltipOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.offsetX = options.offsetX ?? 10;
    this.offsetY = options.offsetY ?? 10;
  }

  public addToChart(chart: Hd3Chart) {
    if (this.chartData.has(chart)) return;

    const foreignObject = chart.layer.overlay.append('foreignObject')
      .attr('class', 'tooltip-foreign-object')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('x', 0)
      .attr('y', 0)
      .style('pointer-events', 'none')
      .style('overflow', 'visible');

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.pointerEvents = 'none';
    container.style.display = 'none';

    foreignObject.node()!.appendChild(container);

    const chartData: ChartData = {
      foreignObject,
      container,
      data: null,
      handleShow: (data: Hd3TooltipData) => {
        chartData.data = data;
        this.updatePosition(chart, chartData);
      },
      handleHide: () => {
        chartData.data = null;
        this.updatePosition(chart, chartData);
      }
    };

    this.chartData.set(chart, chartData);
    this.bus.on(chart.e.destroyed, this.removeFromChart);
    this.bus.on(chart.e<Hd3TooltipManagerChartEvents>()('tooltipShow'), chartData.handleShow);
    this.bus.on(chart.e<Hd3TooltipManagerChartEvents>()('tooltipHide'), chartData.handleHide);
  }

  public removeFromChart(chart: Hd3Chart) {
    const data = this.chartData.get(chart);
    if (!data) return;

    data.foreignObject.remove();
    this.bus.off(chart.e.destroyed, this.removeFromChart);
    this.bus.off(chart.e<Hd3TooltipManagerChartEvents>()('tooltipShow'), data.handleShow);
    this.bus.off(chart.e<Hd3TooltipManagerChartEvents>()('tooltipHide'), data.handleHide);
    this.chartData.delete(chart);
  }

  /**
   * Iterate over all chart containers.
   */
  public forEachContainer(callback: (container: HTMLElement, chart: Hd3Chart, data: Hd3TooltipData | null) => void) {
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
   * Get tooltip data for a specific chart.
   */
  public getData(chart: Hd3Chart): Hd3TooltipData | null | undefined {
    return this.chartData.get(chart)?.data;
  }

  /**
   * Get all containers as array.
   */
  public getContainers(): Hd3ForeignObjectTooltipContainer[] {
    return [...this.chartData.entries()].map(([chart, chartData]) => ({
      chart,
      container: chartData.container,
      data: chartData.data
    }));
  }

  private updatePosition(chart: Hd3Chart, chartData: ChartData) {
    if (!chartData.data) {
      chartData.container.style.display = 'none';
      return;
    }

    chartData.container.style.display = 'block';

    const { x, y, xSide, ySide } = chartData.data;

    // Get container dimensions after Vue renders content
    const rect = chartData.container.getBoundingClientRect();
    const width = rect.width || 100;
    const height = rect.height || 50;

    let posX = xSide === 'right' ? x + this.offsetX : x - width - this.offsetX;
    let posY = ySide === 'bottom' ? y + this.offsetY : y - height - this.offsetY;

    // Clamp to chart bounds
    posX = Math.max(0, Math.min(posX, chart.innerWidth - width));
    posY = Math.max(0, Math.min(posY, chart.innerHeight - height));

    chartData.container.style.left = `${posX}px`;
    chartData.container.style.top = `${posY}px`;
  }

  destroy() {
    for (const chart of [...this.chartData.keys()]) {
      this.removeFromChart(chart);
    }
  }
}
