<template>
  <div>
    <h2>Core Example - Vanilla TypeScript</h2>
    
    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Tools</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button @click="setTool('none')" :class="{ active: currentTool === 'none' }">None</button>
          <button @click="setTool('pan')" :class="{ active: currentTool === 'pan' }">Pan</button>
          <button @click="setTool('zoom-in')" :class="{ active: currentTool === 'zoom-in' }">Zoom In</button>
          <button @click="setTool('zoom-out')" :class="{ active: currentTool === 'zoom-out' }">Zoom Out</button>
          <button @click="setTool('zoom-selection')" :class="{ active: currentTool === 'zoom-selection' }">Zoom Selection</button>
          <button @click="setTool('reset')" :class="{ active: currentTool === 'reset' }">Reset</button>
        </div>
      </div>
      
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Series Visibility</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <label v-for="(series, idx) in seriesVisibility" :key="idx" style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" v-model="series.visible" @change="toggleSeriesVisibility(idx)" />
            <span>{{ series.name }}</span>
          </label>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 20px;">
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Chart 1 - Multiple Series Types</h3>
        <div ref="chartContainer1" style="width: 100%; height: 500px;"></div>
      </div>
      
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Chart 2 - Logarithmic Y Axis</h3>
        <div ref="chartContainer2" style="width: 100%; height: 500px;"></div>
      </div>
    </div>

    <div 
      v-if="tooltipVisible" 
      ref="tooltipEl"
      style="
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 4px;
        pointer-events: none;
        font-size: 12px;
        z-index: 1000;
      "
      :style="{
        left: tooltipX + 'px',
        top: tooltipY + 'px'
      }"
    >
      <div v-for="item in tooltipData" :key="item.name" style="margin: 2px 0;">
        <strong>{{ item.name }}:</strong> {{ item.value.toFixed(2) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Hd3Chart,
  Hd3XAxis,
  Hd3YAxis,
  Hd3XAxisRenderer,
  Hd3YAxisRenderer,
  Hd3Series,
  Hd3Line,
  Hd3Area,
  Hd3Bars,
  Hd3Scatter,
  Hd3InteractionArea,
  Hd3ToolState,
  Hd3PanTool,
  Hd3ZoomTool,
  Hd3ZoomToSelectionTool,
  Hd3ResetTool,
  Hd3TooltipManager
} from '../../src/core/index';

const chartContainer1 = ref<HTMLElement>();
const chartContainer2 = ref<HTMLElement>();
const tooltipEl = ref<HTMLElement>();

const currentTool = ref<string>('none');
const tooltipVisible = ref(false);
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipData = ref<Array<{ name: string; value: number }>>([]);

let toolState: Hd3ToolState;
let series1: Hd3Series;
let series2: Hd3Series;
let series3: Hd3Series;
let series4: Hd3Series;

const seriesVisibility = ref([
  { name: 'Sin Wave (Line)', visible: true },
  { name: 'Cos Wave (Area)', visible: true },
  { name: 'Bars', visible: true },
  { name: 'Scatter', visible: true }
]);

function setTool(tool: string) {
  currentTool.value = tool;
  toolState.currentTool = tool as any;
}

function toggleSeriesVisibility(idx: number) {
  const allSeries = [series1, series2, series3, series4];
  allSeries[idx].setVisible(seriesVisibility.value[idx].visible);
}

onMounted(() => {
  if (!chartContainer1.value || !chartContainer2.value) return;

  // Generate data
  const sinData: [number, number][] = [];
  const cosData: [number, number][] = [];
  const barData: [number, number][] = [];
  const scatterData: [number, number][] = [];
  const expData: [number, number][] = [];

  for (let i = 0; i <= 100; i++) {
    const x = (i / 100) * 4 * Math.PI;
    sinData.push([x, Math.sin(x)]);
    cosData.push([x, Math.cos(x)]);
    if (i % 10 === 0) {
      barData.push([x, Math.sin(x) * 0.5 + 0.5]);
    }
    if (i % 5 === 0) {
      scatterData.push([x, Math.cos(x) * 0.8 + Math.random() * 0.4 - 0.2]);
    }
    expData.push([x, Math.exp(x / 5)]);
  }

  // Chart 1 - Multiple series types
  const chart1 = new Hd3Chart(chartContainer1.value, {
    width: chartContainer1.value.offsetWidth,
    height: 500,
    margin: { top: 20, right: 20, bottom: 40, left: 60 }
  });

  const xAxis1 = new Hd3XAxis({
    name: 'x1',
    type: 'linear',
    domain: [0, 4 * Math.PI],
    range: [0, chart1.innerWidth]
  });

  const yAxis1 = new Hd3YAxis({
    name: 'y1',
    domain: [-1.5, 1.5],
    range: [chart1.innerHeight, 0]
  });

  series1 = new Hd3Series({ name: 'Sin Wave', data: sinData });
  series2 = new Hd3Series({ name: 'Cos Wave', data: cosData });
  series3 = new Hd3Series({ name: 'Bars', data: barData });
  series4 = new Hd3Series({ name: 'Scatter', data: scatterData });

  const line1 = new Hd3Line({
    series: series1,
    xAxis: xAxis1,
    yAxis: yAxis1,
    style: { color: '#e74c3c', strokeWidth: 2 }
  });
  const area1 = new Hd3Area({
    series: series2,
    xAxis: xAxis1,
    yAxis: yAxis1,
    style: { color: '#3498db', opacity: 0.3 }
  });
  const bars1 = new Hd3Bars({
    series: series3,
    xAxis: xAxis1,
    yAxis: yAxis1,
    style: { color: '#2ecc71', barWidth: 15 }
  });
  const scatter1 = new Hd3Scatter({
    series: series4,
    xAxis: xAxis1,
    yAxis: yAxis1,
    style: { color: '#f39c12', radius: 5 }
  });

  const xAxisRenderer1 = new Hd3XAxisRenderer({ axis: xAxis1, position: 'bottom' });
  const yAxisRenderer1 = new Hd3YAxisRenderer({ axis: yAxis1, position: 'left' });

  chart1.emit('addRenderer', xAxisRenderer1);
  chart1.emit('addRenderer', yAxisRenderer1);
  chart1.emit('addRenderer', line1);
  chart1.emit('addRenderer', area1);
  chart1.emit('addRenderer', bars1);
  chart1.emit('addRenderer', scatter1);

  chart1.emit('addSeries', series1);
  chart1.emit('addSeries', series2);
  chart1.emit('addSeries', series3);
  chart1.emit('addSeries', series4);

  // Chart 2 - Logarithmic axis
  const chart2 = new Hd3Chart(chartContainer2.value, {
    width: chartContainer2.value.offsetWidth,
    height: 500,
    margin: { top: 20, right: 20, bottom: 40, left: 80 }
  });

  const xAxis2 = new Hd3XAxis({
    name: 'x2',
    type: 'linear',
    domain: [0, 4 * Math.PI],
    range: [0, chart2.innerWidth]
  });

  const yAxis2 = new Hd3YAxis({
    name: 'y2',
    domain: [0.1, 100],
    range: [chart2.innerHeight, 0],
    logarithmic: true,
    logBase: 10
  });

  const series5 = new Hd3Series({ name: 'Exponential', data: expData });
  const line2 = new Hd3Line({
    series: series5,
    xAxis: xAxis2,
    yAxis: yAxis2,
    style: { color: '#9b59b6', strokeWidth: 3 }
  });

  const xAxisRenderer2 = new Hd3XAxisRenderer({ axis: xAxis2, position: 'bottom' });
  const yAxisRenderer2 = new Hd3YAxisRenderer({ axis: yAxis2, position: 'left' });

  chart2.emit('addRenderer', xAxisRenderer2);
  chart2.emit('addRenderer', yAxisRenderer2);
  chart2.emit('addRenderer', line2);
  chart2.emit('addSeries', series5);

  // Interaction setup
  const interactionArea1 = new Hd3InteractionArea();
  const interactionArea2 = new Hd3InteractionArea();
  
  chart1.emit('addRenderer', interactionArea1);
  chart2.emit('addRenderer', interactionArea2);

  toolState = new Hd3ToolState();

  // Tools for chart 1
  new Hd3PanTool({ interactionArea: interactionArea1, toolState, axes: { x: [xAxis1], y: [yAxis1] } });
  new Hd3ZoomTool({ interactionArea: interactionArea1, toolState, axes: { x: [xAxis1], y: [yAxis1] } });
  new Hd3ZoomToSelectionTool({ chart: chart1, interactionArea: interactionArea1, toolState, axes: { x: [xAxis1], y: [yAxis1] } });
  new Hd3ResetTool({ toolState, axes: { x: [xAxis1], y: [yAxis1] } });

  // Tools for chart 2
  new Hd3PanTool({ interactionArea: interactionArea2, toolState, axes: { x: [xAxis2], y: [yAxis2] } });
  new Hd3ZoomTool({ interactionArea: interactionArea2, toolState, axes: { x: [xAxis2], y: [yAxis2] } });
  new Hd3ZoomToSelectionTool({ chart: chart2, interactionArea: interactionArea2, toolState, axes: { x: [xAxis2], y: [yAxis2] } });
  new Hd3ResetTool({ toolState, axes: { x: [xAxis2], y: [yAxis2] } });

  // Tooltip for chart 1
  const tooltipManager1 = new Hd3TooltipManager({
    chart: chart1,
    interactionArea: interactionArea1,
    series: [series1, series2, series3, series4],
    xAxis: xAxis1,
    yAxis: yAxis1
  });

  tooltipManager1.on('show', (data: any) => {
    tooltipVisible.value = true;
    const containerRect = chartContainer1.value!.getBoundingClientRect();
    tooltipX.value = containerRect.left + chart1.margin.left + data.x + (data.xSide === 'left' ? -120 : 10);
    tooltipY.value = containerRect.top + chart1.margin.top + data.y + (data.ySide === 'top' ? -60 : 10);
    tooltipData.value = data.series;
  });

  tooltipManager1.on('hide', () => {
    tooltipVisible.value = false;
  });

  // Tooltip for chart 2
  const tooltipManager2 = new Hd3TooltipManager({
    chart: chart2,
    interactionArea: interactionArea2,
    series: [series5],
    xAxis: xAxis2,
    yAxis: yAxis2
  });

  tooltipManager2.on('show', (data: any) => {
    tooltipVisible.value = true;
    const containerRect = chartContainer2.value!.getBoundingClientRect();
    tooltipX.value = containerRect.left + chart2.margin.left + data.x + (data.xSide === 'left' ? -120 : 10);
    tooltipY.value = containerRect.top + chart2.margin.top + data.y + (data.ySide === 'top' ? -60 : 10);
    tooltipData.value = data.series;
  });

  tooltipManager2.on('hide', () => {
    tooltipVisible.value = false;
  });
});
</script>

<style scoped>
button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #f0f0f0;
}

button.active {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

h3 {
  margin-top: 0;
  color: #333;
  font-size: 16px;
}
</style>
