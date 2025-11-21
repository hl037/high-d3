import { getHd3GlobalBus } from './bus/Hd3Bus';
import { getHd3GlobalRenderManager } from './managers/Hd3RenderManager';

// Bus
export type { Hd3Bus } from './bus/Hd3Bus';

// Types
export type { Data1D, Data2D, Data2DObj, SeriesData } from './types';

// Chart
export { Hd3Chart, type Hd3ChartOptions } from './chart/Hd3Chart';

// Managers
export { Hd3RenderManager } from './managers/Hd3RenderManager';
export { Hd3SeriesRendererManager as Hd3SeriesManager } from './managers/Hd3SeriesRenderManager';
export { Hd3AxisManager } from './managers/Hd3AxisManager';

// Axis
export { Hd3AxisDomain, type Hd3AxisDomainOptions } from './axis/Hd3AxisDomain';
export { Hd3Axis, type Hd3AxisOptions } from './axis/Hd3Axis';
export { Hd3AxesDiscovery } from './axis/Hd3AxesDiscovery';
export { scaleFactory, type ScaleType, type ScaleFactoryOptions } from './axis/scaleFactory';

// Series
export { Hd3Series, type Hd3SeriesOptions } from './series/Hd3Series';
export { Hd3SeriesRenderer, type Hd3SeriesRendererOptions, type Hd3SeriesRendererStyle } from './series/Hd3SeriesRenderer';
export { Hd3Line, type Hd3LineOptions, type Hd3LineStyle } from './series/Hd3Line';
export { Hd3Area, type Hd3AreaOptions, type Hd3AreaStyle } from './series/Hd3Area';
export { Hd3Bars, type Hd3BarsOptions, type Hd3BarsStyle } from './series/Hd3Bars';
export { Hd3Scatter, type Hd3ScatterOptions, type Hd3ScatterStyle } from './series/Hd3Scatter';

// Interaction
export { Hd3InteractionArea } from './interaction/Hd3InteractionArea';
export { Hd3ToolState, type ToolType } from './interaction/Hd3ToolState';
export { Hd3PanTool, type Hd3PanToolOptions } from './interaction/tools/Hd3PanTool';
export { Hd3ZoomTool, type Hd3ZoomToolOptions } from './interaction/tools/Hd3ZoomTool';
export { Hd3ZoomToSelectionTool, type Hd3ZoomToSelectionToolOptions } from './interaction/tools/Hd3ZoomToSelectionTool';
export { Hd3ResetTool, type Hd3ResetToolOptions } from './interaction/tools/Hd3ResetTool';
export { 
  Hd3CursorIndicator, 
  type Hd3CursorIndicatorOptions,
  type Hd3CursorIndicatorCrossStyle,
  type Hd3CursorIndicatorAxisLabelStyle,
} from './interaction/Hd3CursorIndicator';

// Tooltip
export { Hd3HoverHandler } from './tooltip/Hd3HoverHandler';
export { Hd3TooltipManager, type Hd3TooltipManagerOptions, type Hd3TooltipData } from './tooltip/Hd3TooltipManager';

export function initHd3() {
  getHd3GlobalBus();
  getHd3GlobalRenderManager();
}

