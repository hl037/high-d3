import * as d3 from 'd3';
import { Data2D } from '../types';

type Data2DUnknown = Data2D<number|string|Date>

export class Hd3SeriesInterpolator{
  series_from: Data2DUnknown
  interpolated_series_from: Data2DUnknown
  interpolated_series_to: Data2DUnknown
  series_to: Data2DUnknown
  
  constructor(series_from: Data2DUnknown, series_to: Data2DUnknown){
    function _this(t: number): [d3.AxisDomain, number][]{
      return []
    }

    _this.prototype = Object.create(Hd3SeriesInterpolator);
    _this.series_from = series_to;
    _this.series_to = series_to;
    _this.interpolated_series_to = series_to;
    _this.interpolated_series_from = series_to;
    return _this;
  }
}
