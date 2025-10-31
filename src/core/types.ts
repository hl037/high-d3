export type Data1D = number[];
export type Data2D<T extends number | string | Date = number> = [T, number][];
export type Data2DObj<T extends number | string | Date = number> = { x: T; y: number }[];
export type SeriesData<T extends number | string | Date = number> = Data1D | Data2D<T> | Data2DObj<T>;
