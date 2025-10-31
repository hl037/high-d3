/**
 * Base interface for all objects that can be added to a chart.
 * Features array declares interaction capabilities with other components.
 */
export interface Hd3ChartObjectI {
  features: string[];
  destroy(): void;
}
