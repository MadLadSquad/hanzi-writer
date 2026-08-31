import UserStroke from '../models/UserStroke';

const widthOptions = {
  drawingPressureSensitivity: 1,
  drawingSpeedSensitivity: 1,
  minDrawingWidthScale: 0.5,
  maxDrawingWidthScale: 1.5,
};

describe('UserStroke', () => {
  it('records the points it is given', () => {
    const stroke = new UserStroke(3, { x: 1, y: 2 }, { x: 10, y: 20 }, { time: 0 });
    stroke.appendPoint({ x: 3, y: 4 }, { x: 30, y: 40 }, { time: 16 });

    expect(stroke.id).toBe(3);
    expect(stroke.points).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
    expect(stroke.externalPoints).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
    expect(stroke.times).toEqual([0, 16]);
  });

  it('has no width scales unless width options are given', () => {
    const stroke = new UserStroke(3, { x: 1, y: 2 }, { x: 10, y: 20 }, { time: 0 });
    stroke.appendPoint({ x: 3, y: 4 }, { x: 30, y: 40 }, { time: 16 });

    expect(stroke.widthScales).toBe(null);
  });

  it('tracks a width scale for every point when width options are given', () => {
    const stroke = new UserStroke(
      3,
      { x: 1, y: 2 },
      { x: 10, y: 20 },
      {
        time: 0,
        widthOptions,
      },
    );
    stroke.appendPoint({ x: 3, y: 4 }, { x: 30, y: 40 }, { time: 16 });
    stroke.appendPoint({ x: 5, y: 6 }, { x: 50, y: 60 }, { time: 32 });

    expect(stroke.widthScales!.length).toBe(3);
    stroke.widthScales!.forEach((widthScale) => {
      expect(widthScale).toBeGreaterThanOrEqual(widthOptions.minDrawingWidthScale);
      expect(widthScale).toBeLessThanOrEqual(widthOptions.maxDrawingWidthScale);
    });
  });

  it('draws thicker where the stylus is pressed harder', () => {
    const light = new UserStroke(
      1,
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      {
        time: 0,
        pressure: 0.1,
        widthOptions,
      },
    );
    const heavy = new UserStroke(
      2,
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      {
        time: 0,
        pressure: 0.9,
        widthOptions,
      },
    );

    light.appendPoint({ x: 20, y: 0 }, { x: 20, y: 0 }, { time: 16, pressure: 0.1 });
    heavy.appendPoint({ x: 20, y: 0 }, { x: 20, y: 0 }, { time: 16, pressure: 0.9 });

    expect(heavy.widthScales![0]).toBeGreaterThan(light.widthScales![0]);
    expect(heavy.widthScales![1]).toBeGreaterThan(light.widthScales![1]);
  });

  it('draws thinner where the stroke is drawn faster', () => {
    const slow = new UserStroke(
      1,
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      {
        time: 0,
        widthOptions,
      },
    );
    const fast = new UserStroke(
      2,
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      {
        time: 0,
        widthOptions,
      },
    );

    // same distance covered, but in a tenth of the time
    slow.appendPoint({ x: 200, y: 0 }, { x: 200, y: 0 }, { time: 160 });
    fast.appendPoint({ x: 200, y: 0 }, { x: 200, y: 0 }, { time: 16 });

    expect(fast.widthScales![1]).toBeLessThan(slow.widthScales![1]);
  });

  it('ignores speed when no time has passed between two points', () => {
    const stroke = new UserStroke(
      1,
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      {
        time: 5,
        widthOptions,
      },
    );
    stroke.appendPoint({ x: 200, y: 0 }, { x: 200, y: 0 }, { time: 5 });

    // with nothing known about the point, it keeps the width it already had
    expect(stroke.widthScales![1]).toBe(stroke.widthScales![0]);
  });
});
