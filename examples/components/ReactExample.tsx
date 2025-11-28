import { useState, useEffect, useMemo } from 'react';
import {
  Hd3AxisDomain,
  Hd3Series,
  Hd3Line,
  Hd3Area,
  Hd3Bars,
  Hd3Scatter,
  Hd3PanTool,
  Hd3ZoomTool,
  Hd3ZoomToSelectionTool,
  Hd3ResetTool,
  Hd3CursorIndicator,
  Hd3Axis,
} from '../../src/core';
import { Hd3TooltipMarkers } from '../../src/core/tooltip/Hd3TooltipMarkers';
import { Hd3Toolbox, Hd3ToolStateChangedEvent } from '../../src/core/interaction/Hd3Toolbox';
import { Hd3WheelPanTool } from '../../src/core/interaction/tools/Hd3WheelPanTool';
import { Hd3WheelZoomTool } from '../../src/core/interaction/tools/Hd3WheelZoomTool';
import { RHd3Chart } from '../../src/react/RHd3Chart';
import { RHd3Tooltip } from '../../src/react/RHd3Tooltip';
import { vrHd3TooltipManager } from '../../src/core/VRHd3TooltipManager';
import { getHd3GlobalBus } from '../../src/core/bus/Hd3Bus';

export function ReactExample() {
  const data = useMemo(() => {
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

    // Band scale data
    const categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const bandData1: [string, number][] = categories.map(c => [c, Math.random() * 100]);
    const bandData2: [string, number][] = categories.map(c => [c, Math.random() * 100]);

    return { sinData, cosData, barData, scatterData, expData, categories, bandData1, bandData2 };
  }, []);

  const [seriesVisibility, setSeriesVisibility] = useState([
    { name: 'Sin Wave (Line)', visible: true },
    { name: 'Cos Wave (Area)', visible: true },
    { name: 'Bars', visible: true },
    { name: 'Scatter', visible: true }
  ]);

  const [gridOptions, setGridOptions] = useState({
    enabled: true,
    opacity: 0.3
  });

  const [cursorOptions, setCursorOptions] = useState({
    showCrossX: true,
    showCrossY: true,
    showAxisLabels: true,
    showMarkers: true
  });

  // Chart 1 objects
  const xAxisDom1 = useMemo(() => new Hd3AxisDomain({ domain: [0, 4 * Math.PI] }), []);
  const yAxisDom1 = useMemo(() => new Hd3AxisDomain({ domain: [-1.5, 1.5] }), []);

  const xAxis1 = useMemo(() => new Hd3Axis({
    name: 'x1',
    domain: xAxisDom1,
    scaleType: 'linear',
    position: 'bottom',
  }), [xAxisDom1]);

  const yAxis1 = useMemo(() => new Hd3Axis({
    name: 'y1',
    domain: yAxisDom1,
    scaleType: 'linear',
    position: 'left',
  }), [yAxisDom1]);

  const series1 = useMemo(() => new Hd3Series({ name: 'Sin Wave', data: data.sinData }), [data.sinData]);
  const series2 = useMemo(() => new Hd3Series({ name: 'Cos Wave', data: data.cosData }), [data.cosData]);
  const series3 = useMemo(() => new Hd3Series({ name: 'Bars', data: data.barData }), [data.barData]);
  const series4 = useMemo(() => new Hd3Series({ name: 'Scatter', data: data.scatterData }), [data.scatterData]);

  const line1 = useMemo(() => new Hd3Line({
    series: series1,
    props: {style: { color: '#e74c3c', strokeWidth: 2 }}
  }), [series1]);

  const area1 = useMemo(() => new Hd3Area({
    series: series2,
    props: {style: { color: '#3498db', opacity: 0.3 }}
  }), [series2]);

  const bars1 = useMemo(() => new Hd3Bars({
    series: series3,
    props: {style: { color: '#2ecc71', barWidth: 15 }}
  }), [series3]);

  const scatter1 = useMemo(() => new Hd3Scatter({
    series: series4,
    props: {style:{ color: '#f39c12', radius: 5 }}
  }), [series4]);

  const markers1 = useMemo(() => new Hd3TooltipMarkers({}), []);

  // Chart 2 objects
  const xAxisDom2 = useMemo(() => new Hd3AxisDomain({ domain: [0, 4 * Math.PI] }), []);
  const yAxisDom2 = useMemo(() => new Hd3AxisDomain({ domain: [0.1, 100] }), []);

  const xAxis2 = useMemo(() => new Hd3Axis({
    name: 'x2',
    domain: xAxisDom2,
    scaleType: 'linear',
    position: 'bottom',
  }), [xAxisDom2]);

  const yAxis2 = useMemo(() => new Hd3Axis({
    name: 'y2',
    domain: yAxisDom2,
    scaleType: 'log',
    scaleOptions: { base: 10 },
    position: 'left',
  }), [yAxisDom2]);

  const series5 = useMemo(() => new Hd3Series({ name: 'Exponential', data: data.expData }), [data.expData]);
  
  const line2 = useMemo(() => new Hd3Line({
    series: series5,
    axes: ['x2', 'y2'],
    props: {style: { color: '#9b59b6', strokeWidth: 3 }}
  }), [series5]);

  const markers2 = useMemo(() => new Hd3TooltipMarkers({}), []);

  // Chart 3 objects
  const yAxis3 = useMemo(() => new Hd3Axis({
    name: 'y3',
    domain: yAxisDom1,
    scaleType: 'linear',
    position: 'left',
  }), [yAxisDom1]);

  const series6 = useMemo(() => new Hd3Series({ 
    name: 'Tan Wave', 
    data: data.sinData.map(d => [d[0], Math.tan(d[0]) * 0.3]) 
  }), [data.sinData]);

  const series7 = useMemo(() => new Hd3Series({ 
    name: 'Derivative', 
    data: data.cosData.map((d, i) => [d[0], i < data.cosData.length - 1 ? (data.cosData[i + 1][1] - d[1]) * 10 : 0]) 
  }), [data.cosData]);

  const line3 = useMemo(() => new Hd3Line({
    series: series6,
    props: {style: { color: '#16a085', strokeWidth: 2 }}
  }), [series6]);

  const line4 = useMemo(() => new Hd3Line({
    series: series7,
    props: {style: { color: '#e67e22', strokeWidth: 2 }}
  }), [series7]);

  // Chart 4 - Band scale objects
  const xAxisDomBand = useMemo(() => new Hd3AxisDomain({ domain: data.categories }), [data.categories]);
  const yAxisDomBand = useMemo(() => new Hd3AxisDomain({ domain: [0, 120] }), []);

  const xAxisBand = useMemo(() => new Hd3Axis({
    name: 'xBand',
    domain: xAxisDomBand,
    scaleType: 'band',
    position: 'bottom',
  }), [xAxisDomBand]);

  const yAxisBand = useMemo(() => new Hd3Axis({
    name: 'yBand',
    domain: yAxisDomBand,
    scaleType: 'linear',
    position: 'left',
  }), [yAxisDomBand]);

  const seriesBand1 = useMemo(() => new Hd3Series({ name: 'Sales', data: data.bandData1 }), [data.bandData1]);
  const seriesBand2 = useMemo(() => new Hd3Series({ name: 'Costs', data: data.bandData2 }), [data.bandData2]);

  const barsBand1 = useMemo(() => new Hd3Bars({
    series: seriesBand1,
    axes: ['xBand', 'yBand'],
    props: {
      style: { color: '#3498db', barWidth: 0.8, margin: 0.1 },
      count: 2,
      index: 1,
    }
  }), [seriesBand1]);

  const barsBand2 = useMemo(() => new Hd3Bars({
    series: seriesBand2,
    axes: ['xBand', 'yBand'],
    props: {
      style: { color: '#e74c3c', barWidth: 0.8, margin: 0.1 },
      count: 2,
      index: 2,
    }
  }), [seriesBand2]);
  
  
  const markers4 = useMemo(() => new Hd3TooltipMarkers({}), []);

  // Tools and interactions - only Y axes
  const resetTool = useMemo(() => new Hd3ResetTool(), []);
  
  const tools = useMemo(() => [
    new Hd3PanTool({ axes: ['x1', 'y1', 'x2', 'y3', 'y2', 'yBand'] }),
    new Hd3ZoomTool({ axes: ['x1', 'y1', 'x2', 'y3', 'y2', 'yBand'] }),
    new Hd3WheelPanTool({ axes: ['x1', 'x2', 'yBand'] }),
    new Hd3WheelZoomTool({ axes: ['x1', 'y1', 'x2', 'y2', 'yBand'] }),
    new Hd3ZoomToSelectionTool({ axes: ['x1', 'y1', 'x2', 'y2', 'yBand'] }),
    resetTool,
  ], [resetTool]);

  const toolbox = useMemo(() => {
    const tb = new Hd3Toolbox();
    for (const tool of tools) {
      tb.addTool(tool);
    }
    tb.setMutuallyExclusiveGroups([
      ['wheel-pan', 'wheel-zoom'],
      ['pan', 'zoom', 'zoom-selection']
    ]);
    return tb;
  }, []);

  const tooltipManager = useMemo(() => vrHd3TooltipManager(), []);

  const cursor1 = useMemo(() => new Hd3CursorIndicator({}), []);

  useEffect(() => {
    cursor1.props(cursorOptions);
  }, [cursorOptions.showCrossX, cursorOptions.showCrossY, cursorOptions.showAxisLabels]);

  const [toolState, setToolState] = useState(
    Object.fromEntries(tools.map((t) => [t.name, false]))
  );

  useEffect(() => {
    function handleToolStateChanged({ tool, state }: Hd3ToolStateChangedEvent) {
      setToolState(prev => ({ ...prev, [tool]: state }));
    }

    const bus = getHd3GlobalBus();
    bus.on(toolbox.e.toolStateChanged, handleToolStateChanged);

    return () => {
      bus.off(toolbox.e.toolStateChanged, handleToolStateChanged);
    };
  }, []);

  useEffect(() => {
    xAxis1.props({grid: gridOptions});
    xAxis2.props({grid: gridOptions});
    yAxis1.props({grid: gridOptions});
    yAxis2.props({grid: gridOptions});
    yAxis3.props({grid: gridOptions});
    yAxisBand.props({grid: gridOptions});
  }, [gridOptions, xAxis1, xAxis2, yAxis1, yAxis2, yAxis3, yAxisBand]);

  useEffect(() => {
    line1.visible = seriesVisibility[0].visible;
    area1.visible = seriesVisibility[1].visible;
    bars1.visible = seriesVisibility[2].visible;
    scatter1.visible = seriesVisibility[3].visible;
  }, [seriesVisibility, line1, area1, bars1, scatter1]);

  useEffect(() => {
    toolbox.setToolActive('pan');
    toolbox.setToolActive('wheel-zoom');
    toolbox.setToolActive('reset');
  },[]);

  const toggleSeriesVisibility = (index: number) => {
    setSeriesVisibility(prev => prev.map((s, i) => 
      i === index ? { ...s, visible: !s.visible } : s
    ));
  };

  return (
    <div>
    
      <style>{`
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
      `}</style>
      <h2>Core Example - Vanilla TypeScript</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', flex: 1 }}>
          <h3>Tools</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => toolbox.deactivateAll()} 
              className={toolbox.hasToolActive() ? 'active' : ''}
            >
              None
            </button>
            <button 
              onClick={() => toolbox.setToolActive('pan')} 
              className={toolState['pan'] ? 'active' : ''}
            >
              Pan
            </button>
            <button 
              onClick={() => toolbox.setToolActive('zoom')} 
              className={toolState['zoom'] ? 'active' : ''}
            >
              Zoom In
            </button>
            <button 
              onClick={() => toolbox.setToolActive('zoom-selection')} 
              className={toolState['zoom-selection'] ? 'active' : ''}
            >
              Zoom to Selection
            </button>
            <button 
              onClick={() => toolbox.setToolActive('wheel-zoom')} 
              className={toolState['wheel-zoom'] ? 'active' : ''}
            >
              Wheel zoom
            </button>
            <button 
              onClick={() => toolbox.setToolActive('wheel-pan')} 
              className={toolState['wheel-pan'] ? 'active' : ''}
            >
              Wheel pan
            </button>
            <button 
              onClick={() => resetTool.reset()} 
              className={toolState['reset'] ? 'active' : ''}
            >
              Reset
            </button>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', flex: 1 }}>
          <h3>Series Visibility</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {seriesVisibility.map((series, idx) => (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input 
                  type="checkbox" 
                  checked={series.visible}
                  onChange={() => toggleSeriesVisibility(idx)}
                />
                <span>{series.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', flex: 1 }}>
          <h3>Grid Options</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="checkbox" 
                checked={gridOptions.enabled}
                onChange={(e) => setGridOptions(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <span>Show Grid</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Opacity:</span>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={gridOptions.opacity}
                onChange={(e) => setGridOptions(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                style={{ flex: 1 }} 
              />
              <span>{gridOptions.opacity}</span>
            </label>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', flex: 1 }}>
          <h3>Cursor Indicator Options</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="checkbox" 
                checked={cursorOptions.showCrossX}
                onChange={(e) => setCursorOptions(prev => ({ ...prev, showCrossX: e.target.checked }))}
              />
              <span>Show Cross X</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="checkbox" 
                checked={cursorOptions.showCrossY}
                onChange={(e) => setCursorOptions(prev => ({ ...prev, showCrossY: e.target.checked }))}
              />
              <span>Show Cross Y</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="checkbox" 
                checked={cursorOptions.showAxisLabels}
                onChange={(e) => setCursorOptions(prev => ({ ...prev, showAxisLabels: e.target.checked }))}
              />
              <span>Show Axis Labels</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input 
                type="checkbox" 
                checked={cursorOptions.showMarkers}
                onChange={(e) => setCursorOptions(prev => ({ ...prev, showMarkers: e.target.checked }))}
              />
              <span>Show Markers</span>
            </label>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', flex: 1 }}>
          <h3>Chart 1 - Multiple Series Types</h3>
          <RHd3Chart 
            name="chart1" 
            objects={[xAxis1, yAxis1, line1, area1, bars1, scatter1, cursor1, ...(cursorOptions.showMarkers ? [markers1] : []), toolbox, tooltipManager]} 
            height={400}
          />
        </div>
        
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', flex: 1 }}>
          <h3>Chart 2 - Logarithmic Y Axis</h3>
          <RHd3Chart 
            name="chart2" 
            objects={[xAxis2, yAxis2, line2, tooltipManager, markers4, cursor1, toolbox]} 
            height={400}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', flex: 1 }}>
          <h3>Chart 3 - Synchronized Tooltip with Chart 1</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            This chart shares the same interaction area as Chart 1, so hovering over Chart 1 also shows data on Chart 3.
          </p>
          <RHd3Chart 
            name="chart3" 
            objects={[xAxis1, yAxis3, line3, line4, tooltipManager, ...(cursorOptions.showMarkers ? [markers1] : []), cursor1, toolbox]} 
            height={400}
          />
        </div>

        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', flex: 1 }}>
          <h3>Chart 4 - Band Scale (Categories)</h3>
          <RHd3Chart 
            name="chart4" 
            objects={[xAxisBand, yAxisBand, barsBand1, barsBand2, markers4, cursor1, tooltipManager, toolbox]} 
            height={400}
          />
        </div>
      </div>

      <RHd3Tooltip tooltipManager={tooltipManager}>
        {(data) => (
          <>
            {data.series.map((s: any) => (
              <div key={s.renderer.name} style={{ margin: '2px 0' }}>
                <strong>{s.renderer.name}:</strong> {s.y.toFixed(2)}
              </div>
            ))}
          </>
        )}
      </RHd3Tooltip>

    </div>
  );
}
