
type Opts = {
  each?: boolean
}

interface Res<T> {
  enter(cb:(e:T)=>void):Res<T>,
  exit(cb:(e:T)=>void):Res<T>,
  update(cb:(e:T)=>void):Res<T>,
  all(cb:(e:T)=>void):Res<T>,
  value(): T[],
}

interface ResArr<T> {
  enter(cb:(e:T[])=>void):ResArr<T>,
  exit(cb:(e:T[])=>void):ResArr<T>,
  update(cb:(e:T[])=>void):ResArr<T>,
  all(cb:(e:T[])=>void):ResArr<T>,
  value(): T[],
}

export function mergeArray<T>(target:Iterable<T>, update:Iterable<T>, opts: {each: false}): ResArr<T>;
export function mergeArray<T>(target:Iterable<T>, update:Iterable<T>, opts?: undefined | {each?: true}): Res<T>;
export function mergeArray<T>(target:Iterable<T>, update:Iterable<T>, opts?: Opts): Res<T> | ResArr<T> {
  const targetArr = [...target];
  const updateArr = [...update];
  const targetSet = target instanceof Set ? target : new Set(target);
  const updateSet = update instanceof Set ? update : new Set(update);
  const enter = updateArr.filter((e) => !targetSet.has(e));
  const exit = targetArr.filter((e) => !updateSet.has(e));
  const updated = targetArr.length < updateArr.length ?
    targetArr.filter((e) => updateSet.has(e)) :
    updateArr.filter((e) => targetSet.has(e)) ;
  const all = [...enter, ...updated]
  
  if(opts?.each ?? true) {
    const res = {
      enter(cb:(e:T)=>void){
        for(const e of enter){
          cb(e);
        }
        return res;
      },
      exit(cb:(e:T)=>void){
        for(const e of exit){
          cb(e);
        }
        return res;
      },
      update(cb:(e:T)=>void){
        for(const e of updated){
          cb(e);
        }
        return res;
      },
      all(cb:(e:T)=>void){
        for(const e of all){
          cb(e);
        }
        return res;
      },
      value(): T[] {
        return [...all];
      }
    }
    return res;
  }
  else {
    const res = {
      enter(cb:(e:T[])=>void){
        cb([...enter]);
        return res;
      },
      exit(cb:(e:T[])=>void){
        cb([...exit]);
        return res;
      },
      update(cb:(e:T[])=>void){
        cb([...updated]);
        return res;
      },
      all(cb:(e:T[])=>void){
        cb([...all]);
        return res;
      },
      value(): T[] {
        return [...all];
      }
    }
    return res;
  }
}
