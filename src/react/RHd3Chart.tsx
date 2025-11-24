import { useRef, useEffect } from 'react';
import { Hd3Chart, Hd3ChartI, Hd3ChartOptions } from '../core/chart/Hd3Chart';
import { Hd3RenderTargetI } from '../core/managers/Hd3RenderManager';
import { mergeArray } from '../core/utils/mergeArray';

export interface RHd3ChartObject {
  addToChart(chart: Hd3ChartI | Hd3RenderTargetI): void;
  removeFromChart(chart: Hd3ChartI | Hd3RenderTargetI): void;
}

export interface RHd3ChartProps extends Hd3ChartOptions {
  objects: RHd3ChartObject[];
}

export function RHd3Chart(props: RHd3ChartProps) {
  const chartEl = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Hd3Chart | undefined>();
  const previousObjectsRef = useRef<RHd3ChartObject[]>([]);

  useEffect(() => {
    if (!chartEl.current) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = undefined;
      }
      return;
    }

    if (!chartRef.current) {
      chartRef.current = new Hd3Chart(chartEl.current, props);
    }

    previousObjectsRef.current = mergeArray(previousObjectsRef.current, props.objects)
      .exit((e) => {
        e.removeFromChart(chartRef.current!);
      })
      .enter((e) => {
        e.addToChart(chartRef.current!);
      })
      .value();
  }, [props.objects, props]); // Add other props dependencies if needed

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return <div ref={chartEl} />;
}
