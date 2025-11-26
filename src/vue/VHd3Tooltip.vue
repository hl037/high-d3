<style scoped lang="scss">

</style>

<template>
  <Teleport
    v-if="tooltipTargets"
    v-for="target in tooltipTargets"
    :to="target.container"
  >
    <div>
      <template v-if="target.data">
        <slot :data="target.data">
          <div v-for="s in target.data.series" :key="s.renderer.name" style="margin: 2px 0;">
            <strong>{{ s.renderer.name }}:</strong> {{ s.y.toFixed(2) }}
          </div>
        </slot>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/* global defineProps, defineEmits, defineExpose */

import { ref, watchEffect } from 'vue';
import { Hd3ForeignObjectTooltipContainer } from '../core/tooltip/Hd3ForeignObjectTooltip';
import { VRHd3TooltipManager } from '../core/VRHd3TooltipManager';
import { getHd3GlobalBus } from '../core/bus/Hd3Bus';


const props = defineProps<{
  tooltipManager: VRHd3TooltipManager,
}>();


const tooltipTargets = ref<Hd3ForeignObjectTooltipContainer[]>();


function handleTooltipChanged(){
  tooltipTargets.value = props.tooltipManager.foTooltip.getContainers();
}

let previousManager:VRHd3TooltipManager|undefined = undefined;

watchEffect( () => {
  if(props.tooltipManager !== previousManager) {
    if(previousManager !== undefined) {
      getHd3GlobalBus().off(previousManager.manager.e.show, handleTooltipChanged);
      getHd3GlobalBus().off(previousManager.manager.e.hide, handleTooltipChanged);
      
    }
    previousManager = props.tooltipManager;
    getHd3GlobalBus().on(previousManager.manager.e.show, handleTooltipChanged);
    getHd3GlobalBus().on(previousManager.manager.e.hide, handleTooltipChanged);
  }
});

</script>

