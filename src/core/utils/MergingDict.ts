/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * MergingDict
 *
 * Usage:
 *
 * Assign a new attribute:
 * `mergingDictAttr(this, "prop", {initialValue}, {beforeset, afterSet})`
 *
 * then,
 * `this.prop` returns the object
 * `this.prop = ...` assigns
 * `this.prop(...)` merges with the new arguments
 */

type MergingDictCall<T extends object> = {
  bivarianceHack(update: Partial<T>): MergingDict<T>;
}['bivarianceHack'];

export interface MergingDictHooks<T extends object>{
  beforeSet?: (args: {
    oldVal: MergingDict<T>;
    newVal: MergingDict<T>;
    merging: boolean;
  }) => boolean;
  afterSet?: (val: MergingDict<T>) => void;
}

export type MergingDict<T extends object> =
  T & MergingDictCall<T>;

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  for (const key in source) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      target[key] = sourceVal as T[Extract<keyof T, string>];
    }
  }
  return target;
}

export function mergingDictAttr<
  K extends string,
  T extends object,
  Q extends object
>(
  obj: Q,
  key: K,
  initial: T,
  opts?: MergingDictHooks<T>,
): MergingDict<T> {
  const fn = ((update: Partial<T>) => {
    if (opts?.beforeSet?.({ oldVal: fn, newVal: fn, merging: true })) {
      return fn;
    }
    
    deepMerge(fn as T, update);
    
    opts?.afterSet?.(fn);
    return fn;
  }) as MergingDict<T>;
  
  Object.assign(fn, initial);

  Object.defineProperty(obj, key, {
    get() {
      return fn;
    },
    set(newVal: T) {
      if (opts?.beforeSet?.({ oldVal: fn, newVal: newVal as MergingDict<T>, merging: false })) {
        return;
      }
      
      Object.keys(fn).forEach(k => delete (fn as any)[k]);
      Object.assign(fn, newVal);
      
      opts?.afterSet?.(fn);
    },
    enumerable: true,
    configurable: true
  });

  return fn;
}
