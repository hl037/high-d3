import { Hd3AxisDomain } from './Hd3AxisDomain';
import { Hd3BusEndpoint } from '../bus/Hd3BusEndpoint';
import type { RenderableI } from '../interfaces/RenderableI';
import type { Hd3Chart } from '../chart/Hd3Chart';
import { scaleFactory, ScaleType, D3Scale } from './scaleFactory';

export interface Hd3AxisOptions {
  name: string;
  axis: Hd3AxisDomain;
  scaleType?: ScaleType;
  range?: [number, number];
  scaleOptions?: {
    base?: number;
    exponent?: number;
  };
}

/**
 * Base class for axis renderers.
 * Manages scale creation and updates based on axis domain.
 */
export abstract class Hd3Axis implements RenderableI {
  public name: string;
  protected axis: Hd3AxisDomain;
  protected scaleType: ScaleType;
  protected _range: [number, number];
  protected _scale: D3Scale;
  protected scaleOptions: { base?: number; exponent?: number };
  protected axisBusEndpoint?: Hd3BusEndpoint;
  protected chartBusEndpoint?: Hd3BusEndpoint;
  protected chart?: Hd3Chart;

  constructor(options: Hd3AxisOptions) {
    this.name = options.name;
    this.axis = options.axis;
    this.scaleType = options.scaleType || 'linear';
    this._range = options.range || [0, 100];
    this.scaleOptions = options.scaleOptions || {};
    this._scale = this.createScale();
  }

  protected createScale(): D3Scale {
    return scaleFactory(this.scaleType, {
      domain: this.axis.domain,
      range: this._range,
      ...this.scaleOptions
    });
  }

  get scale(): D3Scale {
    return this._scale;
  }

  get range(): [number, number] {
    return this._range;
  }

  set range(value: [number, number]) {
    this._range = value;
    this.updateScale();
  }

  protected updateScale(): void {
    this._scale = this.createScale();
    if (this.chart) {
      this.updateRender();
    }
  }

  render(chart: Hd3Chart): void {
    this.chart = chart;
    
    // Connect to axis bus for domain changes
    this.axisBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        domainChanged: () => {
          this.updateScale();
        }
      }
    });
    this.axisBusEndpoint.bus = this.axis.getBus();

    // Connect to chart bus for visibility
    this.chartBusEndpoint = new Hd3BusEndpoint({
      listeners: {
        [`axis-${this.name}-visibility`]: (visible: unknown) => {
          this.setVisible(visible as boolean);
        }
      }
    });
    this.chartBusEndpoint.bus = chart.getBus();

    this.doRender(chart);
  }

  public getAxisDomain(): Hd3AxisDomain {
    return this.axis;
  }

  protected abstract doRender(chart: Hd3Chart): void;
  protected abstract updateRender(): void;
  protected abstract setVisible(visible: boolean): void;
  public abstract getOrientation(): 'x' | 'y';

  destroy(): void {
    this.axisBusEndpoint?.destroy();
    this.chartBusEndpoint?.destroy();
  }
}
