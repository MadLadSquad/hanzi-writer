import {
  getPressureSignal,
  getSpeedSignal,
  getStrokeWidths,
  getWidthScale,
  REFERENCE_SPEED,
} from '../userStrokeWidth';

const options = {
  drawingPressureSensitivity: 1,
  drawingSpeedSensitivity: 1,
  minDrawingWidthScale: 0.5,
  maxDrawingWidthScale: 1.5,
};

describe('userStrokeWidth', () => {
  describe('getPressureSignal', () => {
    it('is 0.5 at a normal pressure, and spans 0 to 1 across the pressure range', () => {
      expect(getPressureSignal(0)).toBe(0);
      expect(getPressureSignal(0.5)).toBe(0.5);
      expect(getPressureSignal(1)).toBe(1);
    });

    it('clamps pressures outside of the 0 - 1 range', () => {
      expect(getPressureSignal(-3)).toBe(0);
      expect(getPressureSignal(7)).toBe(1);
    });
  });

  describe('getSpeedSignal', () => {
    it('is 1 when standing still and 0.5 at the reference speed', () => {
      expect(getSpeedSignal(0)).toBe(1);
      expect(getSpeedSignal(REFERENCE_SPEED)).toBe(0.5);
    });

    it('decreases towards 0 as the speed increases', () => {
      expect(getSpeedSignal(2 * REFERENCE_SPEED)).toBeLessThan(0.5);
      expect(getSpeedSignal(100 * REFERENCE_SPEED)).toBeGreaterThan(0);
      expect(getSpeedSignal(100 * REFERENCE_SPEED)).toBeLessThan(0.05);
    });
  });

  describe('getWidthScale', () => {
    it('draws at the default width when nothing is known about the point', () => {
      expect(getWidthScale({}, options)).toBe(1);
    });

    it('draws thicker the harder the stylus is pressed', () => {
      expect(getWidthScale({ pressure: 1 }, options)).toBe(1.5);
      expect(getWidthScale({ pressure: 0.5 }, options)).toBe(1);
      expect(getWidthScale({ pressure: 0 }, options)).toBe(0.5);
    });

    it('draws thinner the faster the stroke is drawn', () => {
      expect(getWidthScale({ speed: 0 }, options)).toBe(1.5);
      expect(getWidthScale({ speed: REFERENCE_SPEED }, options)).toBe(1);
      expect(getWidthScale({ speed: 100 * REFERENCE_SPEED }, options)).toBeLessThan(0.6);
    });

    it('combines pressure and speed', () => {
      // pressing hard while moving fast lands somewhere in the middle
      const scale = getWidthScale({ pressure: 1, speed: 3 * REFERENCE_SPEED }, options);
      expect(scale).toBeGreaterThan(
        getWidthScale({ speed: 3 * REFERENCE_SPEED }, options),
      );
      expect(scale).toBeLessThan(getWidthScale({ pressure: 1 }, options));
    });

    it('ignores inputs whose sensitivity is 0', () => {
      expect(
        getWidthScale(
          { pressure: 1, speed: 0 },
          { ...options, drawingPressureSensitivity: 0 },
        ),
      ).toBe(getWidthScale({ speed: 0 }, options));
      expect(
        getWidthScale(
          { pressure: 1, speed: 0 },
          { ...options, drawingSpeedSensitivity: 0 },
        ),
      ).toBe(getWidthScale({ pressure: 1 }, options));
    });

    it('scales the effect of each input by its sensitivity', () => {
      expect(
        getWidthScale({ pressure: 1 }, { ...options, drawingPressureSensitivity: 0.5 }),
      ).toBe(1.25);
    });

    it('stays within the min and max scales, however extreme the inputs', () => {
      expect(getWidthScale({ pressure: 1, speed: 0 }, options)).toBe(1.5);
      expect(getWidthScale({ pressure: 0, speed: 1000 * REFERENCE_SPEED }, options)).toBe(
        0.5,
      );
    });

    it('handles min and max scales given the wrong way round', () => {
      const flipped = {
        ...options,
        minDrawingWidthScale: 1.5,
        maxDrawingWidthScale: 0.5,
      };
      expect(getWidthScale({ pressure: 1 }, flipped)).toBe(1.5);
      expect(getWidthScale({ pressure: 0 }, flipped)).toBe(0.5);
    });

    it('smooths towards the previous width to keep the line from getting jittery', () => {
      expect(getWidthScale({ pressure: 0, prevWidthScale: 1.5 }, options)).toBe(1);
      expect(getWidthScale({ pressure: 1, prevWidthScale: 0.5 }, options)).toBe(1);
    });
  });

  describe('getStrokeWidths', () => {
    it('scales the drawing width by the width scale of each point', () => {
      expect(getStrokeWidths(4, [0.5, 1, 1.5])).toEqual([2, 4, 6]);
    });

    it('is null if there are no width scales', () => {
      expect(getStrokeWidths(4, null)).toBe(null);
      expect(getStrokeWidths(4, [])).toBe(null);
      expect(getStrokeWidths(4)).toBe(null);
    });
  });
});
