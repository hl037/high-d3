type Callable<
  TClass extends new (...args: any[]) => any,
  TCall extends (...args: any[]) => any
> = {
  new (...args: ConstructorParameters<TClass>): TCall & InstanceType<TClass>;
};

class _Hd3SeriesInterpolator{
  public readonly from!: [number, number][] | number;
  public readonly to!: [number, number][];
  public readonly interpolatedFrom!: [number, number][];
  public readonly interpolatedTo!: [number, number][];

  constructor(from:[number, number][] | number, to:[number, number][]){
    const interpolatedFrom: [number, number][] = [];
    const interpolatedTo: [number, number][] = [];
    
    let i = 0, j = 0;
    let lastFrom = null;
    let lastTo = null;
    
    const nearestIn = (x:number, last:[number, number]|null, next:[number, number]|null) => {
      if (!last) return next;
      if (!next) return last;
      return (x - last[0]) <= (next[0] - x) ? last : next;
    };

    if(typeof from === 'number') {
      for(const val of to){
        interpolatedTo.push(val);
        interpolatedFrom.push([val[0], from]);
      }
    }
    else {
      while (i < from.length || j < to.length) {
        const fx = i < from.length ? from[i][0] : Infinity;
        const tx = j < to.length ? to[j][0] : Infinity;

        if (fx === tx) {
          interpolatedFrom.push(from[i]);
          interpolatedTo.push(to[j]);
          lastFrom = from[i++];
          lastTo = to[j++];
        } else if (fx < tx) {
          interpolatedFrom.push(from[i]);
          interpolatedTo.push(nearestIn(fx, lastTo, to[j])!);
          lastFrom = from[i++];
        } else {
          interpolatedFrom.push(nearestIn(tx, lastFrom, from[i])!);
          interpolatedTo.push(to[j]);
          lastTo = to[j++];
        }
      }
    }
    
    const interpolate = (t:number) => {
      return interpolatedFrom.map((p, idx) => [
        p[0] + (interpolatedTo[idx][0] - p[0]) * t,
        p[1] + (interpolatedTo[idx][1] - p[1]) * t,
      ]);
    };
    
    return Object.assign(interpolate, {
      from,
      to,
      interpolatedFrom,
      interpolatedTo,
    });
    
  }
}

export const Hd3SeriesInterpolator = (_Hd3SeriesInterpolator as unknown as Callable<typeof _Hd3SeriesInterpolator, {(t:number) : [number, number][]}>)

