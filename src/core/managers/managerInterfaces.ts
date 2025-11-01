import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import type { Hd3Series } from '../series/Hd3Series';

// Interfaces for manager callback patterns

export interface AxesState {
  x: Hd3XAxis[];
  y: Hd3YAxis[];
}

export interface GetAxesCallback {
  setAxes(state: AxesState): void;
}

export interface SeriesState {
  series: Hd3Series[];
}

export interface GetSeriesCallback {
  setSeries(state: SeriesState): void;
}
