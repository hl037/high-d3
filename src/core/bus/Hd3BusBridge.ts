import type { Hd3Bus } from './Hd3Bus';
import type { EventType, Handler } from 'mitt';
import { Hd3BusEndpoint } from './Hd3BusEndpoint';


export interface Hd3BusBridgeOptions<Events extends Record<EventType, unknown>> {
  events?: (keyof Events)[];
  buses: Hd3Bus<Events>[];
};


/**
 * Bridges two buses to mutualise the events passed in the constructor (or all events if unspecified
 */
export class Hd3BusBridge<Events extends Record<EventType, unknown> = Record<EventType, unknown>> {
  private events: (keyof Events)[] | undefined;
  private endpoints: Hd3BusEndpoint<Events>[];
  
  private forwardFactory(bus: Hd3Bus<Events>){
    return <T extends keyof Events>(
      type:T,
      event:Events[T]
    ) => {
      for(const endpoint of this.endpoints){
        if(endpoint.bus !== bus) {
          endpoint.bus?.emit(type, event);
        }
      }
    }
  }

  constructor(opts: Hd3BusBridgeOptions<Events>){
    this.events = opts.events;
    this.endpoints = opts.buses.map((bus) => {
      const forward = this.forwardFactory(bus);
      const listeners = (
        this.events === undefined
        ? {
          ['*']: forward,
        }
        : Object.fromEntries(this.events.map(<T extends keyof Events>(eventType: T) => {
          return [eventType, (event: Events[T]) => forward(eventType, event)];
        }))
      )
      return new Hd3BusEndpoint<Events>({
        listeners: listeners as unknown as {[K in keyof Events]?: Handler<Events[K]>},
      });
    })
  }

  destroy(){
    for(const endpoint of this.endpoints){
      endpoint.destroy();
    }
  }
  
}
