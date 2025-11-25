import { MergingDict, mergingDictAttr } from "./MergingDict";

interface PropsEnable<T extends object>{
  getDefaultProps(): T;
  tagDirty(): void;
  get props(): MergingDict<T>;
  set props(_:T);
}

export function mergingDictProps<T extends object>(_this: PropsEnable<T>, props?:Partial<T>) {
  mergingDictAttr(
    _this,
    'props',
    _this.getDefaultProps(),
    {
      afterSet: () =>{
        _this.tagDirty();
      }
    },
  )
  if(props !== undefined) {
    _this.props(props);
  }
}
