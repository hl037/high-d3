<template>
  <div ref="containerRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createRoot, Root } from 'react-dom/client';
import { createElement } from 'react';
import { ReactExample } from './ReactExample';

const containerRef = ref<HTMLElement>();
let root: Root | null = null;

onMounted(() => {
  if (containerRef.value) {
    root = createRoot(containerRef.value);
    root.render(createElement(ReactExample));
  }
});

onUnmounted(() => {
  if (root) {
    root.unmount();
    root = null;
  }
});
</script>
