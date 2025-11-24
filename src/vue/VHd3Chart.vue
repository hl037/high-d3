
<style scoped lang="scss">

</style>

<template>
  <div ref="chartEl">
  </div>
  
</template>

<script setup lang="ts">
/* global defineProps, defineEmits, defineExpose */
import { ref, watchEffect } from "vue";
import { Hd3Chart, Hd3ChartI, Hd3ChartOptions} from "../core/chart/Hd3Chart";
import { Hd3RenderTargetI } from "../core/managers/Hd3RenderManager";
import { mergeArray } from "../core/utils/mergeArray";
import { Hd3InteractionArea } from "../core";
import { Hd3InteractionAreaManagerEvents } from "../core/interaction/Hd3InteractionArea";

export interface VHd3ChartObject{
  addToChart(chart: Hd3ChartI | Hd3RenderTargetI): void;
  removeFromChart(chart: Hd3ChartI | Hd3RenderTargetI): void;
}

export interface Props extends Hd3ChartOptions{
  objects:VHd3ChartObject[],
}

const props = defineProps<Props>();

const chartEl = ref<HTMLElement>();
let chart: Hd3Chart | undefined;
let previousObjects:VHd3ChartObject[] = [];
let interactionArea: Hd3InteractionArea | undefined;

function changeInteractionArea() {
  chart!.bus.off(chart!.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), changeInteractionArea);
  interactionArea = new Hd3InteractionArea();
  interactionArea.addToChart(chart!);
}

function handleInteractionAreaChanged(newArea: Hd3InteractionArea){
  chart!.bus.off(chart!.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), handleInteractionAreaChanged);
  if(interactionArea !== undefined && interactionArea !== newArea) {
    interactionArea!.removeFromChart(chart!);
    interactionArea!.destroy();
    interactionArea = undefined;
  }
  else {
    chart!.bus.off(chart!.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), changeInteractionArea);
  }
}

watchEffect(() => {
  if(chartEl.value === undefined) {
    if(chart === undefined) {
      return;
    }
    chart.destroy();
    return;
  }
  else {
    if(chart !== undefined) {
      return;
    }
    chart = new Hd3Chart(chartEl.value, props);
    chart.bus.on(chart.e<Hd3InteractionAreaManagerEvents>()('getInteractionArea'), changeInteractionArea)
    chart.bus.on(chart.e<Hd3InteractionAreaManagerEvents>()('interactionAreaChanged'), handleInteractionAreaChanged)
  }
  previousObjects = mergeArray(previousObjects, props.objects)
    .exit((e) => {
      e.removeFromChart(chart!);
    })
    .enter((e) => {
      e.addToChart(chart!);
    })
    .value();
})


</script>

