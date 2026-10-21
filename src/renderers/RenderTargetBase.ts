import { Point, PointerSample } from '../typings/types';

type BoundEvent = {
  getPoint(): Point;
  /**
   * Stylus pressure between 0 and 1, or undefined if the device doesn't report pressure.
   * The optional methods below are optional so that custom render targets (via
   * `rendererOverride.createRenderTarget`) don't have to implement them.
   */
  getPressure?(): number | undefined;
  /** When the event happened, in ms on the same clock as `performance.now()` */
  getTime?(): number | undefined;
  /**
   * Every position the pointer passed through since the previous move event, oldest first.
   * Browsers batch fast input (e.g. a 240Hz stylus) into one event per frame, so this can
   * hold several samples. If not implemented, only the event's own position is used.
   */
  getSamples?(): PointerSample[];
  /**
   * Prevents the browser's default handling of the event. Calling this on a pointer start
   * event also marks the pointer as the one drawing the current stroke.
   */
  preventDefault(): void;
};

export type PointerEndInfo = {
  /**
   * True if the stroke was interrupted rather than the pointer being lifted, e.g. the
   * browser canceled the pointer (palm rejection or a system gesture), or a stylus took
   * over from a resting palm
   */
  canceled: boolean;
};

/**
 * Styles applied while drawing is enabled, so touching or clicking the target draws on it
 * rather than scrolling, zooming or selecting text
 */
const DRAWING_STYLES: Record<string, string> = {
  touchAction: 'none',
  userSelect: 'none',
  webkitUserSelect: 'none',
  webkitTouchCallout: 'none',
};

/** Generic render target */
export default class RenderTargetBase<
  TElement extends HTMLElement | SVGElement | SVGSVGElement | HTMLCanvasElement =
    HTMLElement,
> {
  node: TElement;
  /** Pointer drawing the current stroke, so other pointers (e.g. a resting palm) are ignored */
  _activePointerId: number | null = null;
  _activePointerType: string | null = null;
  /** Whether the current press had `preventDefault()` called on its start event */
  _preventDefaultForPress = false;
  _pointerEndCallbacks: Array<(info: PointerEndInfo) => void> = [];
  /** Removes the temporary global listeners tracking the current press */
  _stopTrackingPress: (() => void) | null = null;
  /** Inline styles the node had before drawing was enabled, so they can be restored */
  _savedStyles: Record<string, string> | null = null;

  constructor(node: TElement) {
    this.node = node;

    // Pointer events don't stop touch scrolling on their own, which `touch-action` normally
    // takes care of. Cancelling the touch events as well covers targets where it isn't
    // applied, such as an SVG `<g>` passed in as the target.
    const preventTouchScroll = (evt: Event) => {
      if (this._preventDefaultForPress) {
        evt.preventDefault();
      }
    };
    this.node.addEventListener('touchstart', preventTouchScroll, { passive: false });
    this.node.addEventListener('touchmove', preventTouchScroll, { passive: false });
  }

  addPointerStartListener(callback: (arg: BoundEvent) => void) {
    this.node.addEventListener('pointerdown', (evt) => {
      const pointerEvt = evt as PointerEvent;
      if (this._isOtherPointer(pointerEvt)) {
        if (!this._shouldReplaceActivePointer(pointerEvt)) {
          return;
        }
        // the stroke in progress was drawn by a pointer which has since gone away, or by a
        // resting palm which the stylus now takes over from
        this._releaseActivePointer();
        this._finishPress(true);
      }
      this._startPress();
      const boundEvt = this._eventify(pointerEvt);
      callback({
        ...boundEvt,
        preventDefault: () => {
          boundEvt.preventDefault();
          this._preventDefaultForPress = true;
          this._claimPointer(pointerEvt);
        },
      });
    });
  }

  addPointerMoveListener(callback: (arg: BoundEvent) => void) {
    this.node.addEventListener('pointermove', (evt) => {
      const pointerEvt = evt as PointerEvent;
      if (this._isOtherPointer(pointerEvt)) {
        return;
      }
      callback(this._eventify(pointerEvt));
    });
  }

  /**
   * `callback` is called when a press ends (whether lifted inside or outside the target, or
   * canceled by the browser)
   */
  addPointerEndListener(callback: (info: PointerEndInfo) => void) {
    if (this._pointerEndCallbacks.length === 0) {
      for (const [type, listener] of this._getEndListeners()) {
        this.node.addEventListener(type, listener);
      }
    }
    this._pointerEndCallbacks.push(callback);
  }

  /**
   * Stops the browser from scrolling, zooming or selecting text when the target is touched
   * or clicked, so the user can draw on it. Disabling it restores the node's previous styles.
   */
  setDrawingEnabled(isEnabled: boolean) {
    const style = (this.node as HTMLElement | SVGElement).style as
      Record<string, any> | undefined;
    if (!style) {
      return;
    }
    if (isEnabled && !this._savedStyles) {
      const savedStyles: Record<string, string> = {};
      for (const [prop, value] of Object.entries(DRAWING_STYLES)) {
        savedStyles[prop] = style[prop] ?? '';
        style[prop] = value;
      }
      this._savedStyles = savedStyles;
    } else if (!isEnabled && this._savedStyles) {
      for (const [prop, value] of Object.entries(this._savedStyles)) {
        // leave alone anything the page changed itself while drawing was enabled
        if (style[prop] === DRAWING_STYLES[prop]) {
          style[prop] = value;
        }
      }
      this._savedStyles = null;
    }
  }

  getBoundingClientRect() {
    return this.node.getBoundingClientRect();
  }

  updateDimensions(width: string | number, height: string | number) {
    this.node.setAttribute('width', `${width}`);
    this.node.setAttribute('height', `${height}`);
  }

  /**
   * Listen on `document` while a press is active so that lifting the pointer outside the
   * target still ends the stroke, without leaving global listeners attached at rest.
   */
  _startPress() {
    if (this._stopTrackingPress) {
      return;
    }
    const documentListeners = this._getEndListeners();
    // capture is released right after pointerup / pointercancel, which have already ended the
    // press by then, so this only matches if the pointer went away some other way (e.g. the
    // target was removed from the page mid-stroke)
    const onLostPointerCapture = (evt: Event) => {
      const pointerId = (evt as PointerEvent).pointerId;
      if (this._activePointerId !== null && pointerId === this._activePointerId) {
        this._finishPress(true);
      }
    };

    for (const [type, listener] of documentListeners) {
      document.addEventListener(type, listener);
    }
    this.node.addEventListener('lostpointercapture', onLostPointerCapture);
    this._stopTrackingPress = () => {
      for (const [type, listener] of documentListeners) {
        document.removeEventListener(type, listener);
      }
      this.node.removeEventListener('lostpointercapture', onLostPointerCapture);
    };
  }

  _getEndListeners(): Array<[string, (evt: Event) => void]> {
    const onPointerEnd = (canceled: boolean) => (evt: Event) => {
      if (this._isOtherPointer(evt as PointerEvent)) {
        return;
      }
      this._finishPress(canceled);
    };
    return [
      ['pointerup', onPointerEnd(false)],
      ['pointercancel', onPointerEnd(true)],
    ];
  }

  _finishPress(canceled: boolean) {
    const stopTrackingPress = this._stopTrackingPress;
    this._stopTrackingPress = null;
    this._activePointerId = null;
    this._activePointerType = null;
    this._preventDefaultForPress = false;
    stopTrackingPress?.();
    for (const callback of this._pointerEndCallbacks) {
      callback({ canceled });
    }
  }

  /** Make `pointerEvt` the only pointer which can draw until the current press ends */
  _claimPointer(pointerEvt: PointerEvent) {
    const { pointerId, pointerType } = pointerEvt;
    if (pointerId === undefined) {
      return;
    }
    if (typeof this.node.setPointerCapture === 'function') {
      try {
        // keeps the stroke going if the pointer strays outside of the target, and makes sure
        // the pointerup / pointercancel / lostpointercapture events ending it reach us
        this.node.setPointerCapture(pointerId);
      } catch {
        // the pointer is no longer active (e.g. it was already lifted), so don't claim it
        return;
      }
    }
    this._activePointerId = pointerId;
    this._activePointerType = pointerType ?? null;
  }

  /** Stop capturing the claimed pointer, if it's still captured, so its events go back to normal */
  _releaseActivePointer() {
    const pointerId = this._activePointerId;
    if (
      pointerId === null ||
      typeof this.node.hasPointerCapture !== 'function' ||
      !this.node.hasPointerCapture(pointerId)
    ) {
      return;
    }
    try {
      this.node.releasePointerCapture(pointerId);
    } catch {
      // the pointer already went away, so there's nothing to release
    }
  }

  _isOtherPointer(evt: PointerEvent) {
    return (
      this._activePointerId !== null &&
      evt.pointerId !== undefined &&
      evt.pointerId !== this._activePointerId
    );
  }

  /**
   * Whether a new pointer going down should end the stroke being drawn by the claimed pointer
   * and start a new one
   */
  _shouldReplaceActivePointer(newDownEvt: PointerEvent) {
    if (this._activePointerId === null) {
      return false;
    }
    // A resting palm or finger often lands before the stylus does. People draw with the
    // stylus, so it always wins over a touch.
    if (newDownEvt.pointerType === 'pen' && this._activePointerType === 'touch') {
      return true;
    }
    // the claimed pointer stopped being active without us receiving its end event
    if (
      typeof this.node.hasPointerCapture === 'function' &&
      !this.node.hasPointerCapture(this._activePointerId)
    ) {
      return true;
    }
    // there can only be one primary pointer of a given type at a time, so a new primary
    // pointerdown of the same type means the previous one has already ended
    return Boolean(
      newDownEvt.isPrimary &&
      this._activePointerType !== null &&
      newDownEvt.pointerType === this._activePointerType,
    );
  }

  _eventify(evt: PointerEvent) {
    return {
      getPoint: () => this._getPointerPoint(evt),
      getPressure: () => this._getPointerPressure(evt),
      getTime: () => evt.timeStamp,
      getSamples: (): PointerSample[] => {
        const coalesced =
          typeof evt.getCoalescedEvents === 'function' ? evt.getCoalescedEvents() : [];
        return (coalesced.length > 0 ? coalesced : [evt]).map((sampleEvt) => ({
          point: this._getPointerPoint(sampleEvt),
          pressure: this._getPointerPressure(sampleEvt),
          time: sampleEvt.timeStamp,
        }));
      },
      preventDefault: () => evt.preventDefault(),
    };
  }

  _getPointerPoint(evt: PointerEvent): Point {
    const { left, top } = this.getBoundingClientRect();
    const x = evt.clientX - left;
    const y = evt.clientY - top;
    return { x, y };
  }

  _getPointerPressure(evt: PointerEvent): number | undefined {
    // Only a stylus (`pen`) reports meaningful pressure; a mouse always reports 0.5 while a
    // button is held and many touchscreens report a constant 1.0 for fingers.
    const { pressure, pointerType } = evt;
    if (typeof pressure !== 'number' || !pressure || pointerType !== 'pen') {
      return undefined;
    }
    return pressure;
  }
}
