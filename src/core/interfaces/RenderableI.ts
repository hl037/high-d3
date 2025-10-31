import type { Hd3Chart } from '../chart/Hd3Chart';

/**
 * Interface for objects that can be rendered on a chart.
 */
export interface RenderableI {
  render(chart: Hd3Chart): void;
}
