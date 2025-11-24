<template>
  <div>
    <h2>Core Example - Vanilla TypeScript</h2>
    
    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Tools</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button @click="toolbox.deactivateAll()" :class="{ active: toolbox.hasToolActive() }">None</button>
          <button @click="toolbox.setToolActive('pan')" :class="{ active: toolState['pan'] }">Pan</button>
          <button @click="toolbox.setToolActive('zoom')" :class="{ active: toolState['zoom'] }">Zoom In</button>
          <button @click="toolbox.setToolActive('zoom-selection')" :class="{ active: toolState['zoom-selection'] }">Zoom to Selection</button>
          <button @click="toolbox.setToolActive('wheel-zoom')" :class="{ active: toolState['wheel-zoom'] }">Wheel zoom</button>
          <button @click="toolbox.setToolActive('wheel-pan')" :class="{ active: toolState['wheel-pan'] }">Wheel pan</button>
          <button @click="() => resetTool.reset()" :class="{ active: toolState['reset'] }">Reset</button>
        </div>
      </div>
      
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Series Visibility</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <label v-for="(series, idx) in seriesVisibility" :key="idx" style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" v-model="series.visible"/>
            <span>{{ series.name }}</span>
          </label>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Grid Options</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" v-model="gridOptions.enabled" />
            <span>Show Grid</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px;">
            <span>Opacity:</span>
            <input type="range" min="0" max="1" step="0.1" v-model.number="gridOptions.opacity" style="flex: 1;" />
            <span>{{ gridOptions.opacity }}</span>
          </label>
        </div>
      </div>
      
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Cursor Indicator Options</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" v-model="cursorOptions.showCrossX" />
            <span>Show Cross X</span>
          </label>
          <label style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" v-model="cursorOptions.showCrossY" />
            <span>Show Cross Y</span>
          </label>
          <label style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" v-model="cursorOptions.showAxisLabels" />
            <span>Show Axis Labels</span>
          </label>
          <label style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" v-model="cursorOptions.showMarkers" />
            <span>Show Markers</span>
          </label>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Chart 1 - Multiple Series Types</h3>
        <div ref="chartContainer1" style="width: 100%; height: 400px;"></div>
      </div>
      
      <div style="background: white; padding: 15px; border-radius: 8px; flex: 1;">
        <h3>Chart 2 - Logarithmic Y Axis</h3>
        <div ref="chartContainer2" style="width: 100%; height: 400px;"></div>
      </div>
    </div>

    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h3>Chart 3 - Synchronized Tooltip with Chart 1</h3>
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        This chart shares the same interaction area as Chart 1, so hovering over Chart 1 also shows data on Chart 3.
      </p>
      <div ref="chartContainer3" style="width: 100%; height: 400px;"></div>
    </div>

    <Teleport
      v-if="tooltipTargets"
      v-for="target in tooltipTargets"
      :to="target.container"
    >
      <div>
        <template v-if="target.data">
          <div v-for="s in target.data.series" :key="s.renderer.name" style="margin: 2px 0;">
            <strong>{{ s.renderer.name }}:</strong> {{ s.y.toFixed(2) }}
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watchEffect, watch } from 'vue';
import {
  Hd3Chart,
  Hd3AxisDomain,
  Hd3Series,
  Hd3Line,
  Hd3Area,
  Hd3Bars,
  Hd3Scatter,
  Hd3InteractionArea,
  Hd3PanTool,
  Hd3ZoomTool,
  Hd3ZoomToSelectionTool,
  Hd3ResetTool,
  Hd3TooltipManager,
  Hd3CursorIndicator,
  Hd3Axis,
} from '../../src/core';
import { Hd3ForeignObjectTooltip, Hd3ForeignObjectTooltipContainer } from '@/core/tooltip/Hd3ForeignObjectTooltip';
import { getHd3GlobalBus } from '@/core/bus/Hd3Bus';
import { Hd3TooltipMarkers } from '@/core/tooltip/Hd3TooltipMarkers';
import { Hd3Toolbox, Hd3ToolStateChangedEvent } from '@/core/interaction/Hd3Toolbox';
import { Hd3WheelPanTool } from '@/core/interaction/tools/Hd3WheelPanTool';
import { Hd3WheelZoomTool } from '@/core/interaction/tools/Hd3WheelZoomTool';

const chartContainer1 = ref<HTMLElement>();
const chartContainer2 = ref<HTMLElement>();
const chartContainer3 = ref<HTMLElement>();
const tooltipTargets = ref<Hd3ForeignObjectTooltipContainer[]>();

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

const gridOptions = ref({
  enabled: true,
  opacity: 0.3
});

const cursorOptions = ref({
  showCrossX: true,
  showCrossY: true,
  showAxisLabels: true,
  showMarkers: true
});

const toolbox = new Hd3Toolbox();

const resetTool = new Hd3ResetTool();

// Tools for chart 1
const tools = [
  new Hd3PanTool({ axes: ['x1', 'y3', 'x2', 'y2'] }),
  new Hd3ZoomTool({ axes: ['x1', 'y3', 'x2', 'y2'] }),
  new Hd3WheelPanTool({ axes: ['x1', 'x2'] }),
  new Hd3WheelZoomTool({ axes: ['x1', 'y3', 'x2', 'y2'] }),
  new Hd3ZoomToSelectionTool({ axes: ['x1', 'y3', 'x2', 'y2'] }),
  resetTool,
]

const toolState = reactive(Object.fromEntries(tools.map((t) => [t.name, false])));

function handleToolStateChanged({tool, state}: Hd3ToolStateChangedEvent){
  toolState[tool] = state;
}

getHd3GlobalBus().on(toolbox.e.toolStateChanged, handleToolStateChanged);

for(const tool of tools){
  toolbox.addTool(tool);
}

toolbox.setMutuallyExclusiveGroups([
  ['wheel-pan', 'wheel-zoom'],
  ['pan', 'zoom', 'zoom-selection']
]);

toolbox.setToolActive('pan');
toolbox.setToolActive('wheel-zoom');
toolbox.setToolActive('reset');




onMounted(() => {
  
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
  const chart1 = new Hd3Chart(chartContainer1.value!, {
    margin: { top: 20, right: 20, bottom: 40, left: 60 }
  });

  const xAxisDom1 = new Hd3AxisDomain({
    domain: [0, 4 * Math.PI]
  });

  const yAxisDom1 = new Hd3AxisDomain({
    domain: [-1.5, 1.5]
  });

  const xAxis1 = new Hd3Axis({
    name: 'x1',
    domain: xAxisDom1,
    scaleType: 'linear',
    position: 'bottom',
  });

  const yAxis1 = new Hd3Axis({
    name: 'y1',
    domain: yAxisDom1,
    scaleType: 'linear',
    position: 'left',
  });

  series1 = new Hd3Series({ name: 'Sin Wave', data: sinData });
  series2 = new Hd3Series({ name: 'Cos Wave', data: cosData });
  series3 = new Hd3Series({ name: 'Bars', data: barData });
  series4 = new Hd3Series({ name: 'Scatter', data: scatterData });

  const line1 = new Hd3Line({
    series: series1,
    style: { color: '#e74c3c', strokeWidth: 2 }
  });
  const area1 = new Hd3Area({
    series: series2,
    style: { color: '#3498db', opacity: 0.3 }
  });
  const bars1 = new Hd3Bars({
    series: series3,
    style: { color: '#2ecc71', barWidth: 15 }
  });
  const scatter1 = new Hd3Scatter({
    series: series4,
    style: { color: '#f39c12', radius: 5 }
  });
  
  const interactionArea1 = new Hd3InteractionArea;
  
  const cursor1 = new Hd3CursorIndicator({
    showCrossX: cursorOptions.value.showCrossX,
    showCrossY: cursorOptions.value.showCrossY,
    showAxisLabels: cursorOptions.value.showAxisLabels,
  });

  const tooltipManager1 = new Hd3TooltipManager({});
  const foTooltip = new Hd3ForeignObjectTooltip({});
  const markers1 = new Hd3TooltipMarkers({});


  xAxis1.addToChart(chart1);
  yAxis1.addToChart(chart1);

  line1.addToChart(chart1);
  area1.addToChart(chart1);
  bars1.addToChart(chart1);
  scatter1.addToChart(chart1);

  interactionArea1.addToChart(chart1);
  cursor1.addToChart(chart1);

  tooltipManager1.addToChart(chart1);
  foTooltip.addToChart(chart1);
  markers1.addToChart(chart1);

  toolbox.addToChart(chart1)


  function handleTooltipChanged(){
    tooltipTargets.value = foTooltip.getContainers();
  }

  getHd3GlobalBus().on(tooltipManager1.e.show, handleTooltipChanged);
  getHd3GlobalBus().on(tooltipManager1.e.hide, handleTooltipChanged);
  
  

  
  // Chart 2 - Logarithmic axis
  const chart2 = new Hd3Chart(chartContainer2.value!, {
    margin: { top: 20, right: 20, bottom: 40, left: 80 }
  });

  const xAxisDom2 = new Hd3AxisDomain({
    domain: [0, 4 * Math.PI]
  });

  const yAxisDom2 = new Hd3AxisDomain({
    domain: [0.1, 100]
  });

  const xAxis2 = new Hd3Axis({
    name: 'x2',
    domain: xAxisDom2,
    scaleType: 'linear',
    range: [0, chart2.innerWidth],
    position: 'bottom',
  });

  const yAxis2 = new Hd3Axis({
    name: 'y2',
    domain: yAxisDom2,
    scaleType: 'log',
    range: [chart2.innerHeight, 0],
    scaleOptions: { base: 10 },
    position: 'left',
  });

  const series5 = new Hd3Series({ name: 'Exponential', data: expData });
  const line2 = new Hd3Line({
    series: series5,
    axes: ['x2', 'y2'],
    style: { color: '#9b59b6', strokeWidth: 3 }
  });

  xAxis2.addToChart(chart2);
  yAxis2.addToChart(chart2);
  line2.addToChart(chart2);
  
  const tooltipManager2 = new Hd3TooltipManager({});
  const markers2 = new Hd3TooltipMarkers({});

  tooltipManager2.addToChart(chart2);
  markers2.addToChart(chart2);
  interactionArea1.addToChart(chart2);
  foTooltip.addToChart(chart2);
  cursor1.addToChart(chart2);
  
  toolbox.addToChart(chart2)
  
  getHd3GlobalBus().on(tooltipManager2.e.show, handleTooltipChanged);
  getHd3GlobalBus().on(tooltipManager2.e.hide, handleTooltipChanged);



  // Chart 3 - Synchronized with Chart 1
  const chart3 = new Hd3Chart(chartContainer3.value!, {
    margin: { top: 20, right: 20, bottom: 40, left: 60 }
  });
  
  const yAxis3 = new Hd3Axis({
    name: 'y3',
    domain: yAxisDom1,
    scaleType: 'linear',
    position: 'left',
  });


  // Create complementary series for chart 3
  const series6 = new Hd3Series({ name: 'Tan Wave', data: sinData.map(d => [d[0], Math.tan(d[0]) * 0.3]) });
  const series7 = new Hd3Series({ name: 'Derivative', data: cosData.map((d, i) => [d[0], i < cosData.length - 1 ? (cosData[i + 1][1] - d[1]) * 10 : 0]) });

  const line3 = new Hd3Line({
    series: series6,
    style: { color: '#16a085', strokeWidth: 2 }
  });
  const line4 = new Hd3Line({
    series: series7,
    style: { color: '#e67e22', strokeWidth: 2 }
  });
  
  xAxis1.addToChart(chart3);
  yAxis3.addToChart(chart3);

  line3.addToChart(chart3);
  line4.addToChart(chart3);
  
  interactionArea1.addToChart(chart3);
  cursor1.addToChart(chart3);

  tooltipManager1.addToChart(chart3);
  foTooltip.addToChart(chart3);
  markers1.addToChart(chart3);

  toolbox.addToChart(chart3)

  watchEffect( () => {
    xAxis1.gridOptions(gridOptions.value);
    xAxis2.gridOptions(gridOptions.value);
    yAxis1.gridOptions(gridOptions.value);
    yAxis2.gridOptions(gridOptions.value);
    yAxis3.gridOptions(gridOptions.value);
  })

  watchEffect( () => {
    line1.visible = seriesVisibility.value[0].visible;
    area1.visible = seriesVisibility.value[1].visible;
    bars1.visible = seriesVisibility.value[2].visible;
    scatter1.visible = seriesVisibility.value[3].visible;
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
