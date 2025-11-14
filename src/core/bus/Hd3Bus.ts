import mitt from "mitt";

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

export type Hd3EventNamePayloadMap = object;

export type Hd3EventNameMap<M extends Hd3EventNamePayloadMap> = {
  [K in keyof M]: Hd3Event<M[K]>
}

type _Hd3EventMetaFactory = 
  & (<E extends Hd3EventNamePayloadMap>()=>(<K extends keyof E>(evName:K)=>Hd3Event<E[K]>))
  & (<_ extends void = void>()=>(<K>(evName:string)=>Hd3Event<K>))
  ;

export type Hd3DynamicEventNameMap<M extends Hd3EventNamePayloadMap> = Hd3EventNameMap<M> & _Hd3EventMetaFactory;


export function createHd3EventNameMap<P extends Hd3EventNamePayloadMap>(events:Hd3EventNameMap<P>): Hd3DynamicEventNameMap<P>{
  const additionalEvents: Record<string, Hd3Event<unknown>> = {};
  function map(eventName: string): Hd3Event<unknown> {
    const ev = additionalEvents[eventName];
    if(ev === undefined) {
      const res = createHd3Event<unknown>();
      additionalEvents[eventName] = res;
      return res;
    }
    return ev;
  }
  const dynamicEventMap = (() => {
    return map;
  }) as _Hd3EventMetaFactory;

  return Object.assign(dynamicEventMap, events);
}

export interface Hd3DynamicEventNameMapProvider{
  e: Hd3DynamicEventNameMap<{destroy: unknown}>;
}
