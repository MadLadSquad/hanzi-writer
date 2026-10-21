import { DrawingWidthOptions } from './typings/types';

/**
 * Speed, in character units per millisecond, which draws a line of the default width.
 * Anything slower than this draws a thicker line, anything faster draws a thinner one.
 * A character is 1024 units wide, so this is roughly a stroke across the whole character
 * in ~0.7 seconds.
 */
export const REFERENCE_SPEED = 1.5;

/**
 * Stylus pressure which draws a line of the default width. Pressure is reported between
 * 0 and 1, and a relaxed hand tends to sit around the middle of that range.
 */
export const REFERENCE_PRESSURE = 0.5;

/**
 * How much of the previous point's width carries over after one 60Hz frame, to keep the
 * line from getting jittery
 */
export const WIDTH_SMOOTHING = 0.5;

/** Frame duration, in ms, that `WIDTH_SMOOTHING` is calibrated for (roughly 60Hz) */
export const REFERENCE_FRAME_DURATION = 16;

const NEUTRAL_SIGNAL = 0.5;

const clamp = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));

/**
 * How thick pressure alone says the line should be, from 0 (thinnest) to 1 (thickest),
 * where a "normal" pressure gives 0.5
 */
export const getPressureSignal = (pressure: number) => {
  const clampedPressure = clamp(pressure, 0, 1);
  if (clampedPressure <= REFERENCE_PRESSURE) {
    return (NEUTRAL_SIGNAL * clampedPressure) / REFERENCE_PRESSURE;
  }
  return (
    NEUTRAL_SIGNAL +
    (NEUTRAL_SIGNAL * (clampedPressure - REFERENCE_PRESSURE)) / (1 - REFERENCE_PRESSURE)
  );
};

/**
 * How thick drawing speed alone says the line should be, from 0 (thinnest) to 1 (thickest).
 * Standing still gives 1, drawing at `REFERENCE_SPEED` gives 0.5, and it tapers towards 0
 * from there - the same way a brush leaves less ink behind the faster it's dragged.
 */
export const getSpeedSignal = (speed: number) =>
  REFERENCE_SPEED / (REFERENCE_SPEED + Math.max(speed, 0));

export type WidthScaleParams = {
  /** Stylus pressure between 0 and 1, if the device reports it */
  pressure?: number;
  /** Speed the point was drawn at, in character units per millisecond, if it's known */
  speed?: number;
  /** Width scale of the previous point in the stroke, used to smooth out jitter */
  prevWidthScale?: number;
  /**
   * Time since the previous point, in ms, so smoothing is independent of input polling rate.
   * 0 means no time has passed, so the previous width is kept. If unknown, the previous width
   * is weighted as if one 60Hz frame had passed.
   */
  elapsedTime?: number;
};

/**
 * Multiplier to apply to `drawingWidth` at a single point of a user-drawn stroke, based on
 * how hard the stylus is being pressed and how fast the stroke is being drawn.
 */
export const getWidthScale = (
  { pressure, speed, prevWidthScale, elapsedTime }: WidthScaleParams,
  options: DrawingWidthOptions,
) => {
  const {
    drawingPressureSensitivity,
    drawingSpeedSensitivity,
    minDrawingWidthScale,
    maxDrawingWidthScale,
  } = options;

  // each input nudges the line away from its default width, and contributes nothing if it's
  // either unavailable or switched off via its sensitivity
  let signal = NEUTRAL_SIGNAL;
  if (pressure !== undefined && drawingPressureSensitivity > 0) {
    signal += drawingPressureSensitivity * (getPressureSignal(pressure) - NEUTRAL_SIGNAL);
  }
  if (speed !== undefined && drawingSpeedSensitivity > 0) {
    signal += drawingSpeedSensitivity * (getSpeedSignal(speed) - NEUTRAL_SIGNAL);
  }

  const minScale = Math.min(minDrawingWidthScale, maxDrawingWidthScale);
  const maxScale = Math.max(minDrawingWidthScale, maxDrawingWidthScale);
  const widthScale = minScale + (maxScale - minScale) * clamp(signal, 0, 1);

  if (prevWidthScale === undefined) {
    return widthScale;
  }
  if (elapsedTime !== undefined && elapsedTime <= 0) {
    // no time has passed since the previous point, so the width can't have changed yet.
    // This is the limit of the time-weighted smoothing below as elapsedTime approaches 0.
    return prevWidthScale;
  }
  const smoothing =
    elapsedTime !== undefined
      ? Math.pow(WIDTH_SMOOTHING, elapsedTime / REFERENCE_FRAME_DURATION)
      : WIDTH_SMOOTHING;
  return prevWidthScale * smoothing + widthScale * (1 - smoothing);
};

/**
 * The width, in character units, to draw each point of a user stroke at, or null if the
 * stroke should be drawn at a constant `strokeWidth`.
 */
export const getStrokeWidths = (strokeWidth: number, widthScales?: number[] | null) =>
  widthScales && widthScales.length > 0
    ? widthScales.map((widthScale) => widthScale * strokeWidth)
    : null;
