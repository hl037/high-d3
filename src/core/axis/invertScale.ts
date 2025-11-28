
export function invertScaleRaw(scale: d3.AxisScale<d3.AxisDomain> | undefined, pos: number): number | string | Date | undefined {
  if (!scale) return undefined;

  // Continuous scales (linear, time, log, etc.)
  if ((scale as any).invert) {
    return (scale as any).invert(pos);
  }

  // Band/Point scales
  if (scale.domain && scale.range && (scale as any).step) {
    const domain = scale.domain();
    const range = scale.range();
    const step = (scale as any).step();
    const paddingOuter = (scale as any).paddingOuter?.() ?? 0;

    const start = Math.min(range[0], range[1]);
    const offset = pos - start - paddingOuter * step;
    const index = Math.floor(offset / step);

    if (index >= 0 && index < domain.length) {
      return (domain as any[])[index];
    }
  }

  return undefined;
}

export function invertScale(scale: d3.AxisScale<d3.AxisDomain> | undefined, pos: number): number | string | undefined {
  const res = invertScaleRaw(scale, pos);
  if(res instanceof Date) {
    return res.valueOf()
  }
  else {
    return res;
  }
}

