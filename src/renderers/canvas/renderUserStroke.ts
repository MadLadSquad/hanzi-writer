import { getVariableWidthOutline } from '../../geometry';
import { ColorObject, Point } from '../../typings/types';
import { getStrokeWidths } from '../../userStrokeWidth';
import { drawPath, fillPolygons } from './canvasUtils';

const outlineCache = new WeakMap<
  Point[],
  { widthScales: number[]; strokeWidth: number; outline: Point[][] }
>();

const getCachedOutline = (
  points: Point[],
  strokeWidth: number,
  widthScales?: number[],
): Point[][] | null => {
  if (!widthScales || widthScales.length === 0) {
    return null;
  }
  const cached = outlineCache.get(points);
  if (
    cached &&
    cached.widthScales === widthScales &&
    cached.strokeWidth === strokeWidth
  ) {
    return cached.outline;
  }
  const widths = getStrokeWidths(strokeWidth, widthScales)!;
  const outline = getVariableWidthOutline(points, widths);
  outlineCache.set(points, { widthScales, strokeWidth, outline });
  return outline;
};

export default function renderUserStroke(
  ctx: CanvasRenderingContext2D,
  props: {
    opacity: number;
    strokeWidth: number;
    strokeColor: ColorObject;
    points: Point[];
    /** Multiplier to apply to `strokeWidth` at each point, if the stroke has a variable width */
    widthScales?: number[];
  },
) {
  if (props.opacity < 0.05) {
    return;
  }
  const { opacity, strokeWidth, strokeColor, points, widthScales } = props;
  const { r, g, b, a } = strokeColor;
  const outline = getCachedOutline(points, strokeWidth, widthScales);

  ctx.save();
  ctx.globalAlpha = opacity;
  if (outline) {
    // a stroked line is the same width from end to end, so a variable-width line is drawn
    // as a filled outline around the points instead. Filling the whole outline in one go
    // also keeps the line from darkening where it overlaps itself while fading out.
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    fillPolygons(ctx, outline);
  } else {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawPath(ctx, points);
  }
  ctx.restore();
}
