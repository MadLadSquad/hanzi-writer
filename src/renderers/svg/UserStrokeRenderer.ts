import * as svg from './svgUtils';
import { getPathString, getVariableWidthOutline } from '../../geometry';
import { ColorObject, Point } from '../../typings/types';
import { getStrokeWidths } from '../../userStrokeWidth';
import SVGRenderTarget from './RenderTarget';

export type UserStrokeProps = {
  strokeWidth: number;
  strokeColor: ColorObject;
  opacity: number;
  points: Point[];
  /** Multiplier to apply to `strokeWidth` at each point, if the stroke has a variable width */
  widthScales?: number[];
};

const hasVariableWidth = (props?: UserStrokeProps) => !!props?.widthScales?.length;

const getUserStrokePathString = (props: UserStrokeProps) => {
  const widths = getStrokeWidths(props.strokeWidth, props.widthScales);
  if (!widths) {
    return getPathString(props.points);
  }
  // a stroked path is the same width from end to end, so a variable-width line has to be
  // drawn as a filled outline around the points instead
  return getPathString(getVariableWidthOutline(props.points, widths), true);
};

export default class UserStrokeRenderer {
  _oldProps: UserStrokeProps | undefined = undefined;
  _path: SVGElement | undefined;

  mount(target: SVGRenderTarget) {
    this._path = svg.createElm('path');
    target.svg.appendChild(this._path);
  }

  render(props: UserStrokeProps) {
    if (!this._path || props === this._oldProps) {
      return;
    }
    const isVariableWidth = hasVariableWidth(props);
    if (
      props.strokeColor !== this._oldProps?.strokeColor ||
      props.strokeWidth !== this._oldProps?.strokeWidth ||
      isVariableWidth !== hasVariableWidth(this._oldProps)
    ) {
      const { r, g, b, a } = props.strokeColor;
      const color = `rgba(${r},${g},${b},${a})`;
      svg.attrs(
        this._path,
        isVariableWidth
          ? { fill: color, stroke: 'none' }
          : {
              fill: 'none',
              stroke: color,
              'stroke-width': props.strokeWidth.toString(),
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
            },
      );
    }
    if (props.opacity !== this._oldProps?.opacity) {
      svg.attr(this._path, 'opacity', props.opacity.toString());
    }
    if (
      props.points !== this._oldProps?.points ||
      props.widthScales !== this._oldProps?.widthScales ||
      props.strokeWidth !== this._oldProps?.strokeWidth
    ) {
      svg.attr(this._path, 'd', getUserStrokePathString(props));
    }
    this._oldProps = props;
  }

  destroy() {
    svg.removeElm(this._path);
  }
}
