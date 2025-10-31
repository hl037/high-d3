import type { Hd3Bus } from './Hd3Bus';
import type { EventType, Handler } from 'mitt';

export interface Hd3BusEndpointHooks {
  beforeAdd?: () => void;
  afterAdd?: () => void;
  beforeRemove?: () => void;
  afterRemove?: () => void;
}

export interface Hd3BusEndpointOptions<Events extends Record<EventType, unknown>> {
  listeners: {
    [K in keyof Events]?: Handler<Events[K]>;
  };
  hooks?: Hd3BusEndpointHooks;
  object?: unknown;
}

/**
 * Manages connection to a bus with automatic listener registration/unregistration
 * and lifecycle hooks.
 */
export class Hd3BusEndpoint<Events extends Record<EventType, unknown> = Record<EventType, unknown>> {
  private _bus: Hd3Bus<Events> | undefined;
  private listeners: { [K in keyof Events]?: Handler<Events[K]> };
  private hooks?: Hd3BusEndpointHooks;
  private object?: unknown;

  constructor(opts: Hd3BusEndpointOptions<Events>) {
    this.listeners = opts.listeners;
    this.hooks = opts.hooks;
    this.object = opts.object;
  }

  get bus(): Hd3Bus<Events> | undefined {
    return this._bus;
  }

  set bus(newBus: Hd3Bus<Events> | undefined) {
    // Remove from current bus
    if (this._bus) {
      this.hooks?.beforeRemove?.();
      
      // Unlisten all listeners
      for (const [event, handler] of Object.entries(this.listeners)) {
        if (handler) {
          this._bus.off(event as keyof Events, handler as Handler<Events[keyof Events]>);
        }
      }
      
      this._bus = undefined;
      this.hooks?.afterRemove?.();
    }

    // Add to new bus
    if (newBus) {
      this.hooks?.beforeAdd?.();
      
      // Listen to all listeners
      for (const [event, handler] of Object.entries(this.listeners)) {
        if (handler) {
          newBus.on(event as keyof Events, handler as Handler<Events[keyof Events]>);
        }
      }
      
      this._bus = newBus;
      
      // Emit add event if object is provided
      if (this.object) {
        (newBus as Hd3Bus<Record<string, unknown>>).emit('add', this.object);
      }
      
      this.hooks?.afterAdd?.();
    }
  }

  destroy(): void {
    this.bus = undefined;
  }
}
