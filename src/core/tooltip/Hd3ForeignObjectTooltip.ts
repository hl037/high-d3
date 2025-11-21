import * as d3 from 'd3';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { getHd3GlobalBus, type Hd3Bus } from '../bus/Hd3Bus';
import { Hd3TooltipManager, Hd3TooltipData } from './Hd3TooltipManager';

export interface Hd3ForeignObjectTooltipOptions {
  bus?: Hd3Bus;
  offsetX?: number;
  offsetY?: number;
}

interface ChartData {
  foreignObject: d3.Selection<SVGForeignObjectElement, unknown, null, undefined>;
  container: HTMLDivElement;
}

/**
 * ForeignObject-based tooltip container for Vue Teleport.
 */
export class Hd3ForeignObjectTooltip {
  public readonly bus: Hd3Bus;
  private chartData: Map<Hd3Chart, ChartData>;
  private tooltipManager?: Hd3TooltipManager;
  private offsetX: number;
  private offsetY: number;
  private lastData?: Hd3TooltipData;
  private isVisible: boolean = false;

  private handleShow: (data: Hd3TooltipData) => void;
  private handleHide: () => void;

  constructor(options: Hd3ForeignObjectTooltipOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.chartData = new Map();
    this.offsetX = options.offsetX ?? 10;
    this.offsetY = options.offsetY ?? 10;

    this.handleShow = (data: Hd3TooltipData) => {
      this.lastData = data;
      this.isVisible = true;
      this.updatePosition();
    };

    this.handleHide = () => {
      this.isVisible = false;
      this.updatePosition();
    };
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

    this.chartData.set(chart, { foreignObject, container });
    this.bus.on(chart.e.destroyed, this.removeFromChart);
  }

  public removeFromChart(chart: Hd3Chart) {
    const data = this.chartData.get(chart);
    if (!data) return;

    data.foreignObject.remove();
    this.bus.off(chart.e.destroyed, this.removeFromChart);
    this.chartData.delete(chart);
  }

  public setTooltipManager(manager: Hd3TooltipManager) {
    if (this.tooltipManager) {
      this.bus.off(this.tooltipManager.e.show, this.handleShow);
      this.bus.off(this.tooltipManager.e.hide, this.handleHide);
    }

    this.tooltipManager = manager;
    this.bus.on(manager.e.show, this.handleShow);
    this.bus.on(manager.e.hide, this.handleHide);
  }

  /**
   * Get container for a specific chart.
   */
  public getContainer(chart: Hd3Chart): HTMLElement | undefined {
    return this.chartData.get(chart)?.container;
  }

  /**
   * Get all containers as array.
   */
  public getContainers(): { chart: Hd3Chart; container: HTMLElement }[] {
    return [...this.chartData.entries()].map(([chart, data]) => ({
      chart,
      container: data.container
    }));
  }

  private updatePosition() {
    for (const [chart, data] of this.chartData) {
      if (!this.isVisible || !this.lastData) {
        data.container.style.display = 'none';
        continue;
      }

      data.container.style.display = 'block';

      const { x, y, xSide, ySide } = this.lastData;

      // Get container dimensions after Vue renders content
      const rect = data.container.getBoundingClientRect();
      const width = rect.width || 100;
      const height = rect.height || 50;

      let posX = xSide === 'right' ? x + this.offsetX : x - width - this.offsetX;
      let posY = ySide === 'bottom' ? y + this.offsetY : y - height - this.offsetY;

      // Clamp to chart bounds
      posX = Math.max(0, Math.min(posX, chart.innerWidth - width));
      posY = Math.max(0, Math.min(posY, chart.innerHeight - height));

      data.container.style.left = `${posX}px`;
      data.container.style.top = `${posY}px`;
    }
  }

  destroy() {
    if (this.tooltipManager) {
      this.bus.off(this.tooltipManager.e.show, this.handleShow);
      this.bus.off(this.tooltipManager.e.hide, this.handleHide);
    }

    for (const chart of [...this.chartData.keys()]) {
      this.removeFromChart(chart);
    }
  }
}
