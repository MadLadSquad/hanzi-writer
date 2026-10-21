import { distance } from '../geometry';
import { DrawingWidthOptions, Point } from '../typings/types';
import { getWidthScale } from '../userStrokeWidth';
import { arrLast, performanceNow } from '../utils';

/**
 * Minimum time window (in ms) to average drawing speed over when queued pointer events
 * arrive in a tight burst
 */
const SPEED_SAMPLE_WINDOW = 8;

/**
 * Minimum elapsed time (in ms) before speed can be meaningfully estimated
 */
const MIN_SPEED_ELAPSED_TIME = 1;

/**
 * Maximum number of previous points to look back over when estimating drawing speed
 */
const MAX_SPEED_SAMPLE_POINTS = 16;

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
    const prevTime = arrLast(this.times);

    this.points.push(point);
    this.externalPoints.push(externalPoint);
    this.times.push(time);

    if (this._widthOptions && this.widthScales) {
      this.widthScales.push(
        getWidthScale(
          {
            pressure,
            speed: this._getSpeed(),
            prevWidthScale: arrLast(this.widthScales),
            // timestamps never run backwards, but guard against inconsistent time sources
            elapsedTime: Math.max(time - prevTime, 0),
          },
          this._widthOptions,
        ),
      );
    }
  }

  /**
   * Drawing speed at the latest point, in character units per ms, averaged over at least
   * `SPEED_SAMPLE_WINDOW` ms (or as much of the stroke as is available) so a burst of queued
   * events doesn't look like a sudden flick. Returns undefined if too little time has passed
   * to tell how fast the stroke is being drawn.
   */
  _getSpeed(): number | undefined {
    const lastIndex = this.points.length - 1;
    // bound the work per point, in case timestamps don't advance (e.g. coarsened timers)
    const firstIndex = Math.max(0, lastIndex - MAX_SPEED_SAMPLE_POINTS);
    const latestTime = this.times[lastIndex];
    let totalDistance = 0;
    let elapsedTime = 0;
    for (let i = lastIndex; i > firstIndex; i--) {
      totalDistance += distance(this.points[i], this.points[i - 1]);
      elapsedTime = latestTime - this.times[i - 1];
      if (elapsedTime >= SPEED_SAMPLE_WINDOW) {
        break;
      }
    }
    // pointer events can arrive with little or no time between them when the main thread
    // is busy, which says nothing about how fast the stroke is being drawn
    return elapsedTime >= MIN_SPEED_ELAPSED_TIME ? totalDistance / elapsedTime : undefined;
  }
}
