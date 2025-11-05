import * as d3 from 'd3';
import { createHd3Bus, createHd3Event, dynamicEventMap, getHd3GlobalBus, Hd3Bus, Hd3Event, Hd3EventFactory } from '../bus/Hd3Bus';
import { Hd3RenderManager } from '../managers/Hd3RenderManager';
import { Hd3SeriesManager } from '../managers/Hd3SeriesManager';
import { Hd3AxisManager } from '../managers/Hd3AxisManager';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';

export interface Hd3ChartOptions {
  bus?: Hd3Bus;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export interface Hd3ChartEvents {
  destroyed: Hd3Event<Hd3Chart>,
  get: Hd3EventFactory
}


/**
 * Central chart class. Manages SVG element and serves as store for all chart objects.
 * Implements Hd3Bus for event-driven communication.
 */
export class Hd3Chart {
  private bus: Hd3Bus;
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private resizeObserver?: ResizeObserver;
  private autoWidth: boolean;
  private autoHeight: boolean;
  private resizeTimeout?: number;
  private resizeDebounceMs: number = 100;
  
  public width: number;
  public height: number;
  public margin: { top: number; right: number; bottom: number; left: number };
  public innerWidth: number;
  public innerHeight: number;
  public e: Hd3ChartEvents;

  constructor(container: HTMLElement | string, options: Hd3ChartOptions = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container)! 
      : container;

    this.bus = options.bus || getHd3GlobalBus();

    this.e = {
      get: dynamicEventMap(),
      destroyed: createHd3Event<Hd3Chart>(),
    }
    
    this.autoWidth = options.width === undefined;
    this.autoHeight = options.height === undefined;
    
    this.width = options.width || this.container.clientWidth || 800;
    this.height = options.height || this.container.clientHeight || 600;
    this.margin = options.margin || { top: 20, right: 20, bottom: 40, left: 60 };
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
    
    this.mainGroup = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Initialize managers
    new Hd3SeriesManager(this);
    new Hd3AxisManager(this);

    // Listen to resize events and update SVG
    this.resizeBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        resize: (data: unknown) => this.handleResize(data)
      }
    });
    this.resizeBusEndpoint.bus = this.bus;

    // Setup ResizeObserver if width or height is auto
    if (this.autoWidth || this.autoHeight) {
      this.setupResizeObserver();
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = this.autoWidth ? entry.contentRect.width : this.width;
        const newHeight = this.autoHeight ? entry.contentRect.height : this.height;
        
        if (newWidth !== this.width || newHeight !== this.height) {
          // Debounce resize calls
          if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
          }
          this.resizeTimeout = window.setTimeout(() => {
            this.resize(newWidth, newHeight);
          }, this.resizeDebounceMs);
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  private handleResize(data: unknown): void {
    const resizeData = data as { width: number; height: number };
    
    this.svg
      .attr('width', resizeData.width)
      .attr('height', resizeData.height);
  }

  /**
   * Get the main SVG group where content should be rendered
   */
  getMainGroup(): d3.Selection<SVGGElement, unknown, null, undefined> {
    return this.mainGroup;
  }

  /**
   * Get the SVG element
   */
  getSVG(): d3.Selection<SVGSVGElement, unknown, null, undefined> {
    return this.svg;
  }

  /**
   * Get the chart bus for event communication
   */
  getBus(): Hd3Bus {
    return this.bus;
  }

  /**
   * Emit an event on the chart bus
   */
  emit(event: string, data?: unknown): void {
    this.bus.emit(event, data);
  }

  /**
   * Listen to an event on the chart bus
   */
  on(event: string, handler: (data?: unknown) => void): void {
    this.bus.on(event, handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: (data?: unknown) => void): void {
    this.bus.off(event, handler);
  }

  /**
   * Resize the chart
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.innerWidth = width - this.margin.left - this.margin.right;
    this.innerHeight = height - this.margin.top - this.margin.bottom;
    
    // Emit resize event - listeners will handle the actual resizing
    this.emit('resize', { width, height });
  }

  /**
   * Destroy the chart and cleanup
   */
  destroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeObserver?.disconnect();
    this.resizeBusEndpoint.destroy();
    this.renderManager.destroy();
    this.seriesManager.destroy();
    this.axisManager.destroy();
    this.svg.remove();
  }

  /**
   * Export chart as SVG string
   */
  exportSVG(): string {
    const svgNode = this.svg.node();
    if (!svgNode) {
      throw new Error('SVG node not found');
    }
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgNode);
  }

  /**
   * Download chart as SVG file
   */
  downloadSVG(filename: string = 'chart.svg'): void {
    const svgString = this.exportSVG();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export chart as PNG (returns a Promise with data URL)
   */
  async exportPNG(scale: number = 2): Promise<string> {
    return new Promise((resolve, reject) => {
      const svgString = this.exportSVG();
      const canvas = document.createElement('canvas');
      canvas.width = this.width * scale;
      canvas.height = this.height * scale;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Download chart as PNG file
   */
  async downloadPNG(filename: string = 'chart.png', scale: number = 2): Promise<void> {
    const dataUrl = await this.exportPNG(scale);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }
}
