import { MergingDict, mergingDictAttr, MergingDictHooks } from "./MergingDict";

interface PropsEnable<T extends object>{
  getDefaultProps(): T;
  get props(): MergingDict<T>;
  set props(_:T);
}

interface DirtyTaggable{
  tagDirty: ()=> void;
}

export function mergingDictProps<T extends object>(_this: PropsEnable<T> & DirtyTaggable, props?:Partial<T>):void;
export function mergingDictProps<T extends object>(_this: PropsEnable<T>, props:Partial<T>|undefined, hooks: MergingDictHooks<T>):void;
export function mergingDictProps<T extends object>(_this: PropsEnable<T> | (PropsEnable<T> & DirtyTaggable), props?:Partial<T>, hooks?: MergingDictHooks<T>) {
  mergingDictAttr(
    _this,
    'props',
    _this.getDefaultProps(),
    hooks ?? {
      afterSet: () =>{
        (_this as DirtyTaggable).tagDirty();
      }
    },
  )
  if(props !== undefined) {
    _this.props(props);
  }
}
