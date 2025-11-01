import * as d3 from 'd3';

export type ScaleType = 
  | 'linear' 
  | 'log' 
  | 'pow' 
  | 'sqrt' 
  | 'time' 
  | 'utc'
  | 'sequential' 
  | 'quantize' 
  | 'quantile' 
  | 'threshold' 
  | 'ordinal' 
  | 'point' 
  | 'band'
  | 'symlog'
  | 'radial';

export type D3Scale = 
  | d3.ScaleLinear<number, number>
  | d3.ScaleLogarithmic<number, number>
  | d3.ScalePower<number, number>
  | d3.ScaleTime<number, number>
  | d3.ScaleSequential<string>
  | d3.ScaleQuantize<number>
  | d3.ScaleQuantile<number>
  | d3.ScaleThreshold<number, number>
  | d3.ScaleOrdinal<string, unknown>
  | d3.ScalePoint<string>
  | d3.ScaleBand<string>
  | d3.ScaleSymLog<number, number>
  | d3.ScaleRadial<number, number>;

export interface ScaleFactoryOptions {
  domain: [number | Date | string, number | Date | string] | string[];
  range: [number, number];
  base?: number;
  exponent?: number;
}

type ScaleFactoryFn = (options: ScaleFactoryOptions) => D3Scale;

export const scaleFactories: Record<ScaleType, ScaleFactoryFn> = {
  linear: (options) => d3.scaleLinear()
    .domain(options.domain as [number, number])
    .range(options.range),
  
  log: (options) => d3.scaleLog()
    .base(options.base || 10)
    .domain(options.domain as [number, number])
    .range(options.range),
  
  pow: (options) => d3.scalePow()
    .exponent(options.exponent || 2)
    .domain(options.domain as [number, number])
    .range(options.range),
  
  sqrt: (options) => d3.scaleSqrt()
    .domain(options.domain as [number, number])
    .range(options.range),
  
  time: (options) => d3.scaleTime()
    .domain(options.domain as [Date, Date])
    .range(options.range),
  
  utc: (options) => d3.scaleUtc()
    .domain(options.domain as [Date, Date])
    .range(options.range),
  
  symlog: (options) => d3.scaleSymlog()
    .domain(options.domain as [number, number])
    .range(options.range),
  
  radial: (options) => d3.scaleRadial()
    .domain(options.domain as [number, number])
    .range(options.range),
  
  sequential: (options) => d3.scaleSequential(d3.interpolateViridis)
    .domain(options.domain as [number, number]),
  
  quantize: (options) => d3.scaleQuantize()
    .domain(options.domain as [number, number])
    .range(options.range as unknown as number[]),
  
  quantile: (options) => d3.scaleQuantile()
    .domain(options.domain as number[])
    .range(options.range as unknown as number[]),
  
  threshold: (options) => d3.scaleThreshold()
    .domain(options.domain as number[])
    .range(options.range as unknown as number[]),
  
  ordinal: (options) => d3.scaleOrdinal()
    .domain(options.domain as string[]),
  
  point: (options) => d3.scalePoint()
    .domain(options.domain as string[])
    .range(options.range),
  
  band: (options) => d3.scaleBand()
    .domain(options.domain as string[])
    .range(options.range)
};

export const scaleFactory = (type: ScaleType, options: ScaleFactoryOptions): D3Scale => {
  const factory = scaleFactories[type];
  if (!factory) {
    throw new Error(`Unknown scale type: ${type}`);
  }
  return factory(options);
};
