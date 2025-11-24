import { useRef, useEffect } from 'react';
import { Hd3Chart, Hd3ChartI, Hd3ChartOptions } from '../core/chart/Hd3Chart';
import { Hd3RenderTargetI } from '../core/managers/Hd3RenderManager';
import { mergeArray } from '../core/utils/mergeArray';
import { Hd3InteractionArea } from '../core';
import { Hd3InteractionAreaManagerEvents } from '../core/interaction/Hd3InteractionArea';

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
  const interactionAreaRef = useRef<Hd3InteractionArea | undefined>();

  useEffect(() => {
    function changeInteractionArea() {
      const chart = chartRef.current;
      if (!chart) return;

      chart.bus.off(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), changeInteractionArea);
      interactionAreaRef.current = new Hd3InteractionArea();
      interactionAreaRef.current.addToChart(chart);
    }

    function handleInteractionAreaChanged(newArea: Hd3InteractionArea) {
      const chart = chartRef.current;
      if (!chart) return;

      chart.bus.off(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), handleInteractionAreaChanged);
      
      if (interactionAreaRef.current !== undefined && interactionAreaRef.current !== newArea) {
        interactionAreaRef.current.removeFromChart(chart);
        interactionAreaRef.current.destroy();
        interactionAreaRef.current = undefined;
      } else {
        chart.bus.off(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), changeInteractionArea);
      }
    }

    if (!chartEl.current) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = undefined;
      }
      return;
    }

    if (!chartRef.current) {
      chartRef.current = new Hd3Chart(chartEl.current, props);
      chartRef.current.bus.on(chartRef.current.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), changeInteractionArea);
      chartRef.current.bus.on(chartRef.current.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), handleInteractionAreaChanged);
    }

    previousObjectsRef.current = mergeArray(previousObjectsRef.current, props.objects)
      .exit((e) => {
        e.removeFromChart(chartRef.current!);
      })
      .enter((e) => {
        e.addToChart(chartRef.current!);
      })
      .value();
  }, [props.objects, props]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return <div ref={chartEl} />;
}
