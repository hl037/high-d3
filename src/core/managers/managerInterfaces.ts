import type { Hd3XAxisRenderer } from '../axis/Hd3XAxisRenderer';
import type { Hd3YAxisRenderer } from '../axis/Hd3YAxisRenderer';
import type { Hd3Series } from '../series/Hd3Series';

// Interfaces for manager callback patterns

export interface AxisRenderersState {
  x: Hd3XAxisRenderer[];
  y: Hd3YAxisRenderer[];
}

export interface GetAxisRenderersCallback {
  setAxisRenderers(state: AxisRenderersState): void;
}

export interface SeriesState {
  series: Hd3Series[];
}

export interface GetSeriesCallback {
  setSeries(state: SeriesState): void;
}
