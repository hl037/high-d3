import * as d3 from 'd3';
import { createHd3Bus, Hd3Bus } from '../bus/Hd3Bus';
import { Hd3RenderManager } from '../managers/Hd3RenderManager';
import { Hd3SeriesManager } from '../managers/Hd3SeriesManager';

export interface Hd3ChartOptions {
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

/**
 * Central chart class. Manages SVG element and serves as store for all chart objects.
 * Implements Hd3Bus for event-driven communication.
 */
export class Hd3Chart {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private bus: Hd3Bus;
  private renderManager: Hd3RenderManager;
  private seriesManager: Hd3SeriesManager;
  
  public width: number;
  public height: number;
  public margin: { top: number; right: number; bottom: number; left: number };
  public innerWidth: number;
  public innerHeight: number;

  constructor(container: HTMLElement | string, options: Hd3ChartOptions = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container)! 
      : container;
    
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.margin = options.margin || { top: 20, right: 20, bottom: 40, left: 60 };
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    this.bus = createHd3Bus();
    
    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
    
    this.mainGroup = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Initialize managers
    this.renderManager = new Hd3RenderManager(this);
    this.seriesManager = new Hd3SeriesManager(this);
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
    
    this.svg
      .attr('width', width)
      .attr('height', height);
    
    this.emit('resize', { width, height });
  }

  /**
   * Destroy the chart and cleanup
   */
  destroy(): void {
    this.renderManager.destroy();
    this.seriesManager.destroy();
    this.svg.remove();
  }
}
