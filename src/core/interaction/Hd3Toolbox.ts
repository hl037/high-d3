import type { Hd3Chart } from '../chart/Hd3Chart';
import { createHd3Event, getHd3GlobalBus, type Hd3Bus, type Hd3EventNameMap } from '../bus/Hd3Bus';

export interface Hd3Tool {
  readonly name: string;
  addToChart(chart: Hd3Chart): void;
  removeFromChart(chart: Hd3Chart): void;
  destroy(): void;
}

export interface Hd3ToolboxOptions {
  bus?: Hd3Bus;
  tools?: Hd3Tool[];
  mutuallyExclusiveGroups?: string[][];
}

export interface Hd3ToolStateChangedEvent{
  tool: string;
  state: boolean;
}

export interface Hd3ToolboxEvents {
  toolStateChanged: Hd3ToolStateChangedEvent;
  destroyed: Hd3Toolbox;
}

export class Hd3Toolbox {
  public readonly bus: Hd3Bus;
  public readonly e: Hd3EventNameMap<Hd3ToolboxEvents>;
  private tools: Map<string, Hd3Tool>;
  private charts: Set<Hd3Chart>;
  private mutuallyExclusiveGroups: Set<string>[];
  private activeTools: Set<string>;

  constructor(options: Hd3ToolboxOptions = {}) {
    this.removeFromChart = this.removeFromChart.bind(this);
    this.destroy = this.destroy.bind(this);

    this.bus = options.bus || getHd3GlobalBus();
    this.tools = new Map();
    this.charts = new Set();
    this.activeTools = new Set();
    this.mutuallyExclusiveGroups = options.mutuallyExclusiveGroups?.map((s:string[]) => new Set(s)) || [];

    this.e = {
      toolStateChanged: createHd3Event<Hd3ToolStateChangedEvent>('toolbox.toolChanged'),
      destroyed: createHd3Event<Hd3Toolbox>('toolbox.destroyed'),
    };

    if (options.tools) {
      for (const tool of options.tools) {
        this.addTool(tool);
      }
    }
  }

  public addTool(tool: Hd3Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" already exists in toolbox`);
    }

    this.tools.set(tool.name, tool);
  }

  public removeTool(toolName: string): void {
    const tool = this.tools.get(toolName);
    if (!tool) return;

    if (this.activeTools.has(toolName)) {
      this.deactivateTool(toolName);
    }

    this.tools.delete(toolName);
  }

  public addToChart(chart: Hd3Chart): void {
    if (this.charts.has(chart)) return;

    this.charts.add(chart);
    for (const toolName of this.activeTools) {
      const tool = this.tools.get(toolName);
      if (tool) {
        tool.addToChart(chart);
      }
    }

    this.bus.on(chart.e.destroyed, this.removeFromChart);
  }

  public removeFromChart(chart: Hd3Chart): void {
    if (!this.charts.has(chart)) return;

    for (const toolName of this.activeTools) {
      const tool = this.tools.get(toolName);
      if (tool) {
        tool.removeFromChart(chart);
      }
    }

    this.bus.off(chart.e.destroyed, this.removeFromChart);
    this.charts.delete(chart);
  }

  private activateTool(toolName: string): void {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found in toolbox`);
    }

    if (this.activeTools.has(toolName)) return;

    this.activeTools.add(toolName);
    for (const chart of this.charts) {
      tool.addToChart(chart);
    }
    
    this.bus.emit(this.e.toolStateChanged, {tool: toolName, state: true});
  }

  private deactivateTool(toolName: string): void {
    const tool = this.tools.get(toolName);
    if (!tool) return;

    if (!this.activeTools.has(toolName)) return;

    this.activeTools.delete(toolName);
    for (const chart of this.charts) {
      tool.removeFromChart(chart);
    }
    
    this.bus.emit(this.e.toolStateChanged, {tool: toolName, state: false});
  }

  public deactivateAll(){
    for(const tool of [...this.activeTools]){
      this.deactivateTool(tool);
    }
  }

  public hasToolActive(){
    return this.activeTools.size != 0;
  }

  public setToolActive(toolName: string | null, active=true): void {
    if (toolName === null) {
      return;
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found in toolbox`);
    }

    if(!active) {
      this.deactivateTool(toolName);
      return;
    }

    // Find mutual exclusion group
    const group = this.mutuallyExclusiveGroups.find(g => g.has(toolName));
    
    let previous: string | null = null;

    if (group) {
      // Deactivate all tools in the same group
      for (const name of group) {
        if (this.activeTools.has(name)) {
          if (name !== toolName) {
            this.deactivateTool(name);
            previous = name;
          }
        }
      }
    }

    // Activate the new tool
    this.activateTool(toolName);

  }

  public getActiveTool(): string | null {
    // For backward compatibility, return the first active tool
    return this.activeTools.size > 0 ? [...this.activeTools][0] : null;
  }

  public getActiveTools(): string[] {
    return [...this.activeTools];
  }

  public isToolActive(toolName: string): boolean {
    return this.activeTools.has(toolName);
  }

  public getTool(name: string): Hd3Tool | undefined {
    return this.tools.get(name);
  }

  public getTools(): Hd3Tool[] {
    return [...this.tools.values()];
  }

  public setMutuallyExclusiveGroups(groups: string[][]): void {
    this.mutuallyExclusiveGroups = groups.map((s:string[]) => new Set(s));
    // Simply force re-activate tools so that mutually exclude ones are deactivated.
    for(const tool of [...this.activeTools]){
      if(this.activeTools.has(tool)) {
        this.setToolActive(tool);
      }
    } 

  }

  destroy(): void {
    for (const chart of [...this.charts]) {
      this.removeFromChart(chart);
    }

    for (const tool of this.tools.values()) {
      tool.destroy();
    }

    this.tools.clear();
    this.bus.emit(this.e.destroyed, this);
  }
}
