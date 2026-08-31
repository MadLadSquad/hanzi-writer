import { getVariableWidthOutline } from '../../geometry';
import { ColorObject, Point } from '../../typings/types';
import { getStrokeWidths } from '../../userStrokeWidth';
import { drawPath, fillPath } from './canvasUtils';

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
  const widths = getStrokeWidths(strokeWidth, widthScales);

  ctx.save();
  ctx.globalAlpha = opacity;
  if (widths) {
    // a stroked line is the same width from end to end, so a variable-width line is drawn
    // as a filled outline around the points instead. Filling the whole outline in one go
    // also keeps the line from darkening where it overlaps itself while fading out.
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    fillPath(ctx, getVariableWidthOutline(points, widths));
  } else {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawPath(ctx, points);
  }
  ctx.restore();
}
