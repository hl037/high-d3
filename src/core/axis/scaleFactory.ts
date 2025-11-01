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

export const scaleFactory = (type: ScaleType, options: ScaleFactoryOptions): D3Scale => {
  const { domain, range, base = 10, exponent = 2 } = options;

  switch (type) {
    case 'linear':
      return d3.scaleLinear()
        .domain(domain as [number, number])
        .range(range);
    
    case 'log':
      return d3.scaleLog()
        .base(base)
        .domain(domain as [number, number])
        .range(range);
    
    case 'pow':
      return d3.scalePow()
        .exponent(exponent)
        .domain(domain as [number, number])
        .range(range);
    
    case 'sqrt':
      return d3.scaleSqrt()
        .domain(domain as [number, number])
        .range(range);
    
    case 'time':
      return d3.scaleTime()
        .domain(domain as [Date, Date])
        .range(range);
    
    case 'utc':
      return d3.scaleUtc()
        .domain(domain as [Date, Date])
        .range(range);
    
    case 'symlog':
      return d3.scaleSymlog()
        .domain(domain as [number, number])
        .range(range);
    
    case 'radial':
      return d3.scaleRadial()
        .domain(domain as [number, number])
        .range(range);
    
    case 'sequential':
      return d3.scaleSequential(d3.interpolateViridis)
        .domain(domain as [number, number]);
    
    case 'quantize':
      return d3.scaleQuantize()
        .domain(domain as [number, number])
        .range(range as unknown as number[]);
    
    case 'quantile':
      return d3.scaleQuantile()
        .domain(domain as number[])
        .range(range as unknown as number[]);
    
    case 'threshold':
      return d3.scaleThreshold()
        .domain(domain as number[])
        .range(range as unknown as number[]);
    
    case 'ordinal':
      return d3.scaleOrdinal()
        .domain(domain as string[]);
    
    case 'point':
      return d3.scalePoint()
        .domain(domain as string[])
        .range(range);
    
    case 'band':
      return d3.scaleBand()
        .domain(domain as string[])
        .range(range);
    
    default:
      throw new Error(`Unknown scale type: ${type}`);
  }
};
