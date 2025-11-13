import * as d3 from 'd3';

export type Pair<T> = [T, T];

export type Scales = {
  'linear': d3.NumberValue,
  'log': d3.NumberValue,
  'pow': d3.NumberValue,
  'sqrt': d3.NumberValue,
  'time': d3.NumberValue | Date,
  'utc': d3.NumberValue | Date,
  'symlog': d3.NumberValue,
  'radial': d3.NumberValue,
  'point': string,
  'band': string,
}


export type ScaleType = keyof Scales;

export interface ScaleFactoryOptions<T extends d3.AxisDomain> {
  domain: Iterable<T>;
  range: [number, number];
  base?: number;
  exponent?: number;
}

export type ScaleFactories = {
  'linear': <T extends d3.NumberValue>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
  'log': <T extends d3.NumberValue>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
  'pow': <T extends d3.NumberValue>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
  'sqrt': <T extends d3.NumberValue>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
  'time': <T extends d3.NumberValue | Date>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
  'utc': <T extends d3.NumberValue | Date>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
  'symlog': <T extends d3.NumberValue>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
  'radial': <T extends d3.NumberValue>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
  'point': <T extends string>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
  'band': <T extends string>(options:ScaleFactoryOptions<T>) => d3.AxisScale<T>,
}

export const scaleFactories:ScaleFactories = {
  linear<T extends d3.NumberValue>(options:ScaleFactoryOptions<T>){
    return d3.scaleLinear()
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
  
  log<T extends d3.NumberValue>(options:ScaleFactoryOptions<T>){
    return d3.scaleLog()
      .base(options.base || 10)
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
  pow<T extends d3.NumberValue>(options:ScaleFactoryOptions<T>){
    return d3.scalePow()
      .exponent(options.exponent || 2)
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
  sqrt<T extends d3.NumberValue>(options:ScaleFactoryOptions<T>){
    return d3.scaleSqrt()
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
  time<T extends d3.NumberValue | Date>(options:ScaleFactoryOptions<T>){
    return d3.scaleTime()
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
  utc<T extends d3.NumberValue | Date>(options:ScaleFactoryOptions<T>){
    return d3.scaleUtc()
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
  symlog<T extends d3.NumberValue>(options:ScaleFactoryOptions<T>){
    return d3.scaleSymlog()
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
  radial<T extends d3.NumberValue>(options:ScaleFactoryOptions<T>){
    return d3.scaleRadial()
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
  point<T extends string>(options:ScaleFactoryOptions<T>){
    return d3.scalePoint()
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
  band<T extends string>(options:ScaleFactoryOptions<T>){
    return d3.scaleBand()
      .domain(options.domain)
      .range(options.range) as unknown as d3.AxisScale<T>;
  },
}

export function scaleFactory<K extends keyof ScaleFactories>(type: K, options: ScaleFactoryOptions<Scales[K]>): ReturnType<ScaleFactories[K]>{
  const factory = scaleFactories[type] as undefined | (<T extends d3.AxisDomain>(o:ScaleFactoryOptions<T>) => ReturnType<ScaleFactories[K]>);
  if (!factory) {
    throw new Error(`Unknown scale type: ${type}`);
  }
  return factory(options);
};
