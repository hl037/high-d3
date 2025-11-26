import mitt from "mitt";

// -------------------------------------------------------------
// Un Hd3Event est un symbol avec un type embarqué.
// Exemple :
//   const EV = createHd3Event<{x:number}>()
//   → EV est un symbol qui attend {x:number} comme payload
// -------------------------------------------------------------
export type Hd3Event<Payload> = symbol & { __type?: Payload };

export function createHd3Event<Payload>(name?:string): Hd3Event<Payload> {
  return Symbol(name) as Hd3Event<Payload>;
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
  on: (<T>(e:Hd3Event<T>, cb:(d:T)=>void) => void) & (<T>(all:'*', cb: (e:Hd3Event<T>, d:T) => void)=>void),
  off: (<T>(e:Hd3Event<T>, cb:(d:T)=>void) => void) & (<T>(all:'*', cb: (e:Hd3Event<T>, d:T) => void)=>void),
  emit: (<T>(e:Hd3Event<T>, d:T) => void),
}

// Global default singleton
let _globalBus: Hd3Bus | null = null;

function coreHd3GlobalBusProvider(): Hd3Bus {
  if (!_globalBus) {
    _globalBus = mitt() as Hd3Bus;
  }
  return _globalBus;
}

let globalBusProvider = coreHd3GlobalBusProvider;

export function getHd3GlobalBus() {
  return globalBusProvider();
}

export function setHd3GlobalBusProvider(provider: () => Hd3Bus) {
  globalBusProvider = provider;
}

export type Hd3EventNamePayloadMap = object;

// `in out` to a allow passing subclass of an event payload
export type Hd3EventNameMap<in out M extends Hd3EventNamePayloadMap> = {
  [K in keyof M]: Hd3Event<M[K]>
}

type _Hd3EventMetaFactory = 
  & (<E extends Hd3EventNamePayloadMap>(namespace?:string)=>(<K extends keyof E>(evName:K)=>Hd3Event<E[K]>))
  & (<_ extends void = void>(namespace?:string)=>(<K>(evName:string)=>Hd3Event<K>))
  ;

export type Hd3DynamicEventNameMap<M extends Hd3EventNamePayloadMap> = Hd3EventNameMap<M> & _Hd3EventMetaFactory;


export function createHd3EventNameMap<P extends Hd3EventNamePayloadMap>(events:Hd3EventNameMap<P>, owner?:string): Hd3DynamicEventNameMap<P>{
  const additionalEvents: Record<string, Hd3Event<unknown>> = {};
  function map(namespace: string|undefined, eventName: string): Hd3Event<unknown> {
    const ev = additionalEvents[eventName];
    if(ev === undefined) {
      const name = [owner, namespace, eventName].filter((n) => n!== undefined).join('.');
      const res = createHd3Event<unknown>(name);
      additionalEvents[eventName] = res;
      return res;
    }
    return ev;
  }
  const dynamicEventMap = ((namespace?: string) => {
    return (eventName: string) => map(namespace, eventName);
  }) as _Hd3EventMetaFactory;

  return Object.assign(dynamicEventMap, events);
}

export interface Hd3DynamicEventNameMapProvider<T extends {destroy: any} = any>{
  e: Hd3DynamicEventNameMap<T>;
}
