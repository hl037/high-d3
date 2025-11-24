<template>
  <div>
    <h1>high-d3.js Examples</h1>
    
    <div style="margin-bottom: 20px">
      <button 
        v-for="example in examples" 
        :key="example.id"
        @click="currentExample = example.id"
        :style="{
          margin: '5px',
          padding: '10px 20px',
          background: currentExample === example.id ? '#4CAF50' : '#ddd',
          color: currentExample === example.id ? 'white' : '#333',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }"
      >
        {{ example.name }}
      </button>
    </div>

    <CoreExample v-if="currentExample === 'core'" />
    <VueExample v-if="currentExample === 'vue'" />
    <ReactExampleWrapper v-if="currentExample === 'react'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CoreExample from './components/CoreExample.vue';
import VueExample from './components/VueExample.vue';
import ReactExampleWrapper from './components/ReactExampleWrapper.vue';

const examples = [
  { id: 'core', name: 'Core (Vanilla TS)' },
  { id: 'vue', name: 'Vue' },
  { id: 'react', name: 'React' },
];

const currentExample = ref('vue');
</script>
