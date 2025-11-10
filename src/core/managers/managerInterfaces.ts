import type { Hd3XAxis } from '../axis/Hd3XAxis';
import type { Hd3YAxis } from '../axis/Hd3YAxis';
import type { Hd3Series } from '../series/Hd3Series';
import { Hd3AxisManager } from './Hd3AxisManager';

// Interfaces for manager callback patterns

export interface AxesState {
  x: Hd3XAxis[];
  y: Hd3YAxis[];
}

export interface GetAxisManagerCallback {
  setAxisManager(state: Hd3AxisManager): void;
}

export interface SeriesState {
  series: Hd3Series[];
}

