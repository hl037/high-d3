import mitt, { Emitter } from "mitt";

// -------------------------------------------------------------
// Un Hd3Event est un symbol avec un type embarqué.
// Exemple :
//   const EV = createHd3Event<{x:number}>()
//   → EV est un symbol qui attend {x:number} comme payload
// -------------------------------------------------------------
export type Hd3Event<Payload> = symbol & { __type?: Payload };

export function createHd3Event<Payload>(): Hd3Event<Payload> {
  return Symbol() as Hd3Event<Payload>;
}

// -------------------------------------------------------------
// Explanations :
//   [K in Hd3Event<any>]: K["__type"]
//     -> Binds the type to the event
//
//   '*' : { type: K; data: K["__type"] }
//     -> Wild card using the correct types
// -------------------------------------------------------------
export interface Hd3Bus {
  on: <T>(e:Hd3Event<T>, cb:(d:T)=>void) => void,
  off: <T>(e:Hd3Event<T>, cb:(d:T)=>void) => void,
  emit: (<T>(e:Hd3Event<T>, d:T) => void) & (<T>(all:'*', cb: (e:Hd3Event<T>, d:T) => void)=>void),
}

// Global default singleton
let _globalBus: Hd3Bus | null = null;

export function getHd3GlobalBus(): Hd3Bus {
  if (!_globalBus) {
    _globalBus = mitt() as Hd3Bus;
  }
  return _globalBus;
}

export type Hd3EventNameMap = {
  [key: string]: any;
};

export type Hd3EventFactory = 
  & (<E extends Hd3EventNameMap>(eventName: keyof E & string) => Hd3Event<E[typeof eventName]>)
  & (<Payload>(eventName: Payload extends Hd3EventNameMap ? never : string) => Hd3Event<Payload>);

export function dynamicEventMap(): Hd3EventFactory {
  const events: Record<string, Hd3Event<unknown>> = {};
  function map(eventName: string): Hd3Event<unknown> {
    const ev = events[eventName];
    if(ev === undefined) {
      const res = createHd3Event<unknown>();
      events[eventName] = res;
      return res;
    }
    return ev;
  }
  return map as Hd3EventFactory;
}
