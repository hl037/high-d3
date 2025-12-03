<template>
  <Teleport
    v-for="target in containers"
    :key="target.chart.id"
    :to="target.container"
  >
    <div :style="computedStyle">
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onUnmounted } from 'vue';
import { Hd3ForeignObjectAnchor, Hd3ForeignObjectAnchorContainer } from '../core/foreign-object/Hd3ForeignObjectAnchor';
import { getHd3GlobalBus } from '../core/bus/Hd3Bus';

export interface Hd3ForeignObjectAnchorPoint {
  x: number;
  y: number;
}

const props = withDefaults(defineProps<{
  foAnchor: Hd3ForeignObjectAnchor;
  x: number;
  y: number;
  width: number;
  height: number;
  anchor?: Hd3ForeignObjectAnchorPoint;
}>(), {
  anchor: () => ({ x: 0, y: 0 }),
});

const containers = ref<Hd3ForeignObjectAnchorContainer[]>([]);

const computedStyle = computed(() => {
  const anchorPoint = props.anchor!;
  const translateX = -(0.5 + anchorPoint.x * 0.5) * 100;
  const translateY = -(0.5 + anchorPoint.y * 0.5) * 100;

  return {
    position: 'absolute' as const,
    left: `${props.x}px`,
    top: `${props.y}px`,
    width: `${props.width}px`,
    height: `${props.height}px`,
    transform: `translate(${translateX}%, ${translateY}%)`,
  };
});

function handleChanged() {
  containers.value = props.foAnchor.getContainers();
}

let previousAnchor: Hd3ForeignObjectAnchor | undefined = undefined;

watchEffect(() => {
  if (props.foAnchor !== previousAnchor) {
    if (previousAnchor !== undefined) {
      getHd3GlobalBus().off(previousAnchor.e.changed, handleChanged);
    }
    previousAnchor = props.foAnchor;
    getHd3GlobalBus().on(props.foAnchor.e.changed, handleChanged);
    handleChanged();
  }
});

onUnmounted(() => {
  if (previousAnchor !== undefined) {
    getHd3GlobalBus().off(previousAnchor.e.changed, handleChanged);
  }
});
</script>
