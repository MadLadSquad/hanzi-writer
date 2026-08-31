import { Point } from '../typings/types';

type BoundEvent = {
  getPoint(): Point;
  /** Stylus pressure between 0 and 1, or undefined if the device doesn't report pressure */
  getPressure(): number | undefined;
  preventDefault(): void;
};

/** Generic render target */
export default class RenderTargetBase<
  TElement extends
    | HTMLElement
    | SVGElement
    | SVGSVGElement
    | HTMLCanvasElement = HTMLElement
> {
  node: TElement;

  constructor(node: TElement) {
    this.node = node;
  }

  addPointerStartListener(callback: (arg: BoundEvent) => void) {
    this.node.addEventListener('mousedown', (evt) => {
      callback(
        this._eventify(evt as MouseEvent, this._getMousePoint, this._getMousePressure),
      );
    });
    this.node.addEventListener('touchstart', (evt) => {
      callback(
        this._eventify(evt as TouchEvent, this._getTouchPoint, this._getTouchPressure),
      );
    });
  }

  addPointerMoveListener(callback: (arg: BoundEvent) => void) {
    this.node.addEventListener('mousemove', (evt) => {
      callback(
        this._eventify(evt as MouseEvent, this._getMousePoint, this._getMousePressure),
      );
    });
    this.node.addEventListener('touchmove', (evt) => {
      callback(
        this._eventify(evt as TouchEvent, this._getTouchPoint, this._getTouchPressure),
      );
    });
  }

  addPointerEndListener(callback: () => void) {
    // TODO: find a way to not need global listeners
    document.addEventListener('mouseup', callback);
    document.addEventListener('touchend', callback);
  }

  getBoundingClientRect() {
    return this.node.getBoundingClientRect();
  }

  updateDimensions(width: string | number, height: string | number) {
    this.node.setAttribute('width', `${width}`);
    this.node.setAttribute('height', `${height}`);
  }

  _eventify<TEvent extends Event>(
    evt: TEvent,
    pointFunc: (event: TEvent) => Point,
    pressureFunc: (event: TEvent) => number | undefined,
  ) {
    return {
      getPoint: () => pointFunc.call(this, evt),
      getPressure: () => pressureFunc.call(this, evt),
      preventDefault: () => evt.preventDefault(),
    };
  }

  _getMousePoint(evt: MouseEvent): Point {
    const { left, top } = this.getBoundingClientRect();
    const x = evt.clientX - left;
    const y = evt.clientY - top;
    return { x, y };
  }

  _getTouchPoint(evt: TouchEvent): Point {
    const { left, top } = this.getBoundingClientRect();
    const x = evt.touches[0].clientX - left;
    const y = evt.touches[0].clientY - top;
    return { x, y };
  }

  _getMousePressure(evt: MouseEvent): number | undefined {
    // PointerEvent extends MouseEvent, so browsers which fire pointer events for a stylus
    // give us pressure here for free. A plain mouse always reports 0.5 while a button is
    // held, which tells us nothing, so it's treated as having no pressure info.
    const { pressure, pointerType } = evt as PointerEvent;
    if (typeof pressure !== 'number' || !pressure || pointerType === 'mouse') {
      return undefined;
    }
    return pressure;
  }

  _getTouchPressure(evt: TouchEvent): number | undefined {
    // `force` is 0 on devices which can't measure it
    const force = evt.touches[0]?.force;
    return force ? force : undefined;
  }
}
