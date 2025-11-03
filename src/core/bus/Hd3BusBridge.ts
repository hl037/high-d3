import type { Hd3Bus } from './Hd3Bus';
import type { EventType, Handler } from 'mitt';
import { Hd3BusEndpoint } from './Hd3BusEndpoint';


export interface Hd3BusBridgeOptions<Events extends Record<EventType, unknown>> {
  events?: (keyof Events)[];
  buses: Hd3Bus<Events>[][];
};

const __makeId = (() => {
  let i = 0;
  function __makeId(){
    return i++;
  }
  return __makeId;
})();

/**
 * Bridges groups of buses by forwarding event from one group to all others, except buses in the same group.
 */
export class Hd3BusBridge<Events extends Record<EventType, unknown> = Record<EventType, unknown>> {
  private events: (keyof Events)[] | undefined;
  private endpoints: Hd3BusEndpoint<Events>[][];
  private key: string;
  
  private forwardFactory(i: number){
    return (<T extends keyof Events>(
      type:T,
      event:Events[T]
    ) => {
      if((event as any)[this.key]) {
        return;
      }
      (event as any)[this.key] = true;
      for(let j=0 ; j<this.endpoints.length ; ++j){
        if(j === i) {
          continue;
        }
        for(const endpoint of this.endpoints[j]){
          endpoint.bus?.emit(type, event);
        }
      }
    }).bind(this);
  }

  constructor(opts: Hd3BusBridgeOptions<Events>){
    this.events = opts.events;
    this.key = '__forwarded-' + __makeId();
    this.endpoints = opts.buses.map((buses, i) => {
      const forward = this.forwardFactory(i);
      const listeners = (
        this.events === undefined
        ? {
          ['*']: forward,
        }
        : Object.fromEntries(this.events.map(<T extends keyof Events>(eventType: T) => {
          return [eventType, (event: Events[T]) => forward(eventType, event)];
        }))
      )
      return buses.map((bus) => {
        const res = new Hd3BusEndpoint<Events>({
          listeners: listeners as unknown as {[K in keyof Events]?: Handler<Events[K]>},
        });
        res.bus = bus;
        return res;
      });
    })
  }

  destroy(){
    for(const endpoints of this.endpoints){
      for(const endpoint of endpoints){
      endpoint.destroy();
      }
    }
  }
  
}
