import { distance } from '../geometry';
import { DrawingWidthOptions, Point } from '../typings/types';
import { getWidthScale } from '../userStrokeWidth';
import { arrLast, performanceNow } from '../utils';

export type UserStrokePointOptions = {
  /** Stylus pressure between 0 and 1, if the device reports it */
  pressure?: number;
  /** Time the point was drawn at, in ms. Defaults to now. */
  time?: number;
};

export type UserStrokeOptions = UserStrokePointOptions & {
  /** If set, a width scale is tracked for every point of the stroke. If null, the stroke is drawn at a constant width. */
  widthOptions?: DrawingWidthOptions | null;
};

export default class UserStroke {
  id: number;
  points: Point[];
  externalPoints: Point[];
  /** Time each point was drawn at, in ms */
  times: number[];
  /**
   * Multiplier to apply to `drawingWidth` at each point in `points`, or null if the stroke
   * is drawn at a constant width
   */
  widthScales: number[] | null;
  _widthOptions: DrawingWidthOptions | null;

  constructor(
    id: number,
    startingPoint: Point,
    startingExternalPoint: Point,
    { pressure, time = performanceNow(), widthOptions = null }: UserStrokeOptions = {},
  ) {
    this.id = id;
    this.points = [startingPoint];
    this.externalPoints = [startingExternalPoint];
    this.times = [time];
    this._widthOptions = widthOptions;
    this.widthScales = widthOptions ? [getWidthScale({ pressure }, widthOptions)] : null;
  }

  appendPoint(
    point: Point,
    externalPoint: Point,
    { pressure, time = performanceNow() }: UserStrokePointOptions = {},
  ) {
    const prevPoint = arrLast(this.points);
    const prevTime = arrLast(this.times);

    this.points.push(point);
    this.externalPoints.push(externalPoint);
    this.times.push(time);

    if (this._widthOptions && this.widthScales) {
      const elapsedTime = time - prevTime;
      this.widthScales.push(
        getWidthScale(
          {
            pressure,
            // pointer events can arrive with no time between them, which says nothing about
            // how fast the stroke is being drawn
            speed: elapsedTime > 0 ? distance(point, prevPoint) / elapsedTime : undefined,
            prevWidthScale: arrLast(this.widthScales),
          },
          this._widthOptions,
        ),
      );
    }
  }
}
