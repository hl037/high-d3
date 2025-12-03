import * as d3 from 'd3';

import { createHd3Event, createHd3EventNameMap, getHd3GlobalBus, Hd3Bus, Hd3DynamicEventNameMap } from '../bus/Hd3Bus';
import { Hd3SeriesRendererManager } from '../managers/Hd3SeriesRenderManager';
import { Hd3AxisManager } from '../managers/Hd3AxisManager';
import { Hd3RenderTargetI } from '../managers/Hd3RenderManager';

type D3Group = d3.Selection<SVGGElement, unknown, null, undefined>;

export interface Hd3ChartOptions {
  bus?: Hd3Bus;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  name?: string
}

export interface Hd3ResizeEvent{
  width: number,
  height: number
}

export interface Hd3ChartEvents {
  destroyed: Hd3Chart,
  resized: Hd3ResizeEvent,
}

export interface Hd3ChartLayersI{
  background: D3Group;
  axis: D3Group;
  dataRoot: D3Group
  data: {
    back: D3Group;
    middle: D3Group;
    front: D3Group;
  }
  annotationRoot: D3Group;
  annotation: {
    back: D3Group;
    middle: D3Group;
    front: D3Group;
  }
  overlay: D3Group;
  interaction: D3Group;
}

export interface Hd3ChartI extends Hd3RenderTargetI{
  layer: Hd3ChartLayersI;
}

function buildLayers(target: Hd3RenderTargetI): Hd3ChartLayersI {
  const group = target.getRenderTarget();
  const background = group.append('g').attr('class', 'layer-background');
  const axis = group.append('g').attr('class', 'layer-axis');
  const dataRoot = group.append('g').attr('class', 'layer-data');
  const annotationRoot = group.append('g').attr('class', 'layer-annotation');
  
  const dataBack = dataRoot.append('g').attr('class', 'layer-data-back');
  const dataMiddle = dataRoot.append('g').attr('class', 'layer-data-middle');
  const dataFront = dataRoot.append('g').attr('class', 'layer-data-middle');
  
  const annotationBack = annotationRoot.append('g').attr('class', 'layer-annotation-back');
  const annotationMiddle = annotationRoot.append('g').attr('class', 'layer-annotation-middle');
  const annotationFront = annotationRoot.append('g').attr('class', 'layer-annotation-middle');
  
  const overlay = group.append('g').attr('class', 'layer-overlay');
  const interaction = group.append('g').attr('class', 'layer-interaction');

  return {
    background,
    axis,
    dataRoot,
    data: {
      back: dataBack,
      middle: dataMiddle,
      front: dataFront,
    },
    annotationRoot,
    annotation: {
      back: annotationBack,
      middle: annotationMiddle,
      front: annotationFront,
    },
    overlay,
    interaction,
  }


}


/**
 * Central chart class. Manages SVG element and serves as store for all chart objects.
 * Implements Hd3Bus for event-driven communication.
 */
export class Hd3Chart implements Hd3ChartI{
  private static globalId:number = 0;
  public readonly bus: Hd3Bus;
  public readonly e: Hd3DynamicEventNameMap<Hd3ChartEvents>;
  public readonly layer: Hd3ChartLayersI;
  public readonly name?: string;
  public readonly id: number;
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private clipId: string;
  private clipContent: d3.Selection<SVGRectElement, unknown, null, undefined>;
  private mainGroup: D3Group;
  private resizeObserver?: ResizeObserver;
  private autoWidth: boolean;
  private autoHeight: boolean;
  private resizeTimeout?: number;
  private resizeDebounceMs: number = 0;
  
  public width!: number;
  public height!: number;
  public margin: { top: number; right: number; bottom: number; left: number };
  public innerWidth!: number;
  public innerHeight!: number;

  constructor(container: HTMLElement | string, options: Hd3ChartOptions = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container)! 
      : container;

    this.bus = options.bus || getHd3GlobalBus();
    this.name = options.name;
    this.id = Hd3Chart.globalId++;

    this.e = createHd3EventNameMap({
      destroyed: createHd3Event<Hd3Chart>(`chart[${this.id}-${this.name}].destroyed`),
      resized: createHd3Event<Hd3ResizeEvent>(`chart[${this.id}-${this.name}].resized`),
    }, `chart[${this.id}-${this.name}]`);
    
    this.autoWidth = options.width === undefined;
    this.autoHeight = options.height === undefined;
    
    this.margin = options.margin || { top: 20, right: 20, bottom: 40, left: 60 };
    this.svg = d3.select(this.container)
      .append('svg');
    this.clipId = `clip-${this.id}-${Math.random()}`;
    this.clipContent = this.svg
      .append('defs')
      .append('clipPath')
      .attr('id', this.clipId)
      .append('rect')

    this.setSize(
      options.width || this.container.clientWidth || 800,
      options.height || this.container.clientHeight || 600
    );

    
    this.mainGroup = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.layer = buildLayers(this);
    this.layer.dataRoot.attr('clip-path', `url(#${this.clipId})`)

    // Initialize managers
    new Hd3SeriesRendererManager(this);
    new Hd3AxisManager(this);

    // Setup ResizeObserver if width or height is auto
    if (this.autoWidth || this.autoHeight) {
      this.setupResizeObserver();
    }
  }

  private setSize(width:number, height:number){
    this.width = width;
    this.height = height;
    this.innerWidth = Math.max(0, width - this.margin.left - this.margin.right);
    this.innerHeight = Math.max(0, height - this.margin.top - this.margin.bottom);
    
    this.svg
      .attr('width', this.autoWidth ? '100%' : this.width)
      .attr('height', this.autoHeight ? '100%' : this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`);

    this.clipContent
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.innerWidth)
      .attr('height', this.innerHeight);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = this.autoWidth ? entry.contentRect.width : this.width;
        const newHeight = this.autoHeight ? entry.contentRect.height : this.height;
        
        if (newWidth !== this.width || newHeight !== this.height) {
          // Debounce resize calls
          if(this.resizeDebounceMs) {
            if (this.resizeTimeout) {
              clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = window.setTimeout(() => {
              this.resize(newWidth, newHeight);
            }, this.resizeDebounceMs);
          }
          else {
            this.resize(newWidth, newHeight);
          }
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  /**
   * Get the main SVG group where content should be rendered
   */
  getRenderTarget(): d3.Selection<SVGGElement, unknown, null, undefined> {
    return this.mainGroup;
  }

  /**
   * Get the SVG element
   */
  getSVG(): d3.Selection<SVGSVGElement, unknown, null, undefined> {
    return this.svg;
  }

  /**
   * Resize the chart
   */
  resize(width: number, height: number): void {
    this.setSize(width, height);
    
    // Emit resize event - listeners will handle the actual resizing
    this.bus.emit(this.e.resized, { width, height });
  }

  /**
   * Destroy the chart and cleanup
   */
  public destroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeObserver?.disconnect();
    this.bus.emit(this.e.destroyed, this);
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
