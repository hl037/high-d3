import * as d3 from 'd3';

export function scaleCursorPosition<T extends d3.AxisDomain>(
  scale: d3.AxisScale<T>,
  value: T
): number | undefined {
  if ('bandwidth' in scale) {
    // Band or Point scale
    const pos = scale(value);
    if (pos === undefined) return undefined;
    return pos + (scale.bandwidth?.() ?? 0) / 2;
  }
  // Continuous scale (Linear, Time, Log, etc.)
  return scale(value);
}
