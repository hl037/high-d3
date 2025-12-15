<style scoped lang="scss">

</style>

<template>
  <Teleport
    v-if="legendTargets"
    v-for="target in legendTargets"
    :key="target.chart.id"
    :to="target.container"
  >
    <div>
      <template v-if="target.data">
        <slot :data="target.data" :chart="chart">
          <div
            v-for="s in target.data.series"
            :key="s.renderer.name"
            style="display: inline-flex; align-items: center; margin: 2px 4px; cursor: pointer; pointer-events: auto;"
            @click="toggleVisibility(s.renderer)"
          >
            <span
              :style="{
                width: '12px',
                height: '12px',
                backgroundColor: s.color,
                marginRight: '4px',
                opacity: s.visible ? 1 : 0.3,
              }"
            />
            <span :style="{ opacity: s.visible ? 1 : 0.5 }">
              {{ s.renderer.name }}
            </span>
          </div>
        </slot>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/* global defineProps */

import { ref, watchEffect } from 'vue';
import { Hd3ForeignObjectLegendContainer } from '../core/legend/Hd3ForeignObjectLegend';
import { VRHd3LegendManager } from '../core/VRHd3LegendManager';
import { Hd3SeriesRenderer } from '../core/series/Hd3SeriesRenderer';
import { getHd3GlobalBus } from '../core/bus/Hd3Bus';

const props = defineProps<{
  legendManager: VRHd3LegendManager;
}>();

const legendTargets = ref<Hd3ForeignObjectLegendContainer[]>();

function handleLegendChanged() {
  legendTargets.value = props.legendManager.foLegend.getContainers();
}

function toggleVisibility(renderer: Hd3SeriesRenderer) {
  renderer.visible = !renderer.visible;
}

let previousManager: VRHd3LegendManager | undefined = undefined;

watchEffect(() => {
  if (props.legendManager !== previousManager) {
    if (previousManager !== undefined) {
      getHd3GlobalBus().off(previousManager.manager.e.changed, handleLegendChanged);
    }
    previousManager = props.legendManager;
    getHd3GlobalBus().on(previousManager!.manager.e.changed, handleLegendChanged);
    // Get initial state
    handleLegendChanged();
  }
});
</script>
