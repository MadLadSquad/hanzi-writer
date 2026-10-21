import renderUserStroke from '../renderUserStroke';

describe('renderUserStroke', () => {
  let ctx;

  beforeEach(() => {
    ctx = document.createElement('canvas').getContext('2d');
  });

  it('renders a user stroke path', () => {
    const props = {
      strokeColor: { r: 12, g: 101, b: 20, a: 0.3 },
      strokeWidth: 2,
      opacity: 0.7,
      points: [
        { x: 0, y: 0 },
        { x: 17, y: 3 },
        { x: 9, y: 18 },
      ],
    };
    renderUserStroke(ctx, props);
    expect(ctx.__getEvents()).toMatchSnapshot();
  });

  it('fills an outline around the points if the stroke has a variable width', () => {
    const props = {
      strokeColor: { r: 12, g: 101, b: 20, a: 0.3 },
      strokeWidth: 2,
      opacity: 0.7,
      points: [
        { x: 0, y: 0 },
        { x: 17, y: 3 },
        { x: 9, y: 18 },
      ],
      widthScales: [0.5, 1, 1.5],
    };
    renderUserStroke(ctx, props);
    const events = ctx.__getEvents();
    // the pieces of the outline are filled together in one go, so overlaps don't darken
    expect(events.filter((evt) => evt.type === 'fill')).toHaveLength(1);
    expect(events.filter((evt) => evt.type === 'stroke')).toHaveLength(0);
    expect(events.filter((evt) => evt.type === 'moveTo').length).toBeGreaterThan(1);
    expect(events).toMatchSnapshot();
  });

  it('skips rendering if opacity is close to 0', () => {
    const props = {
      strokeColor: { r: 12, g: 101, b: 20, a: 0.3 },
      strokeWidth: 2,
      opacity: 0.01,
      points: [
        { x: 0, y: 0 },
        { x: 17, y: 3 },
        { x: 9, y: 18 },
      ],
    };
    renderUserStroke(ctx, props);
    expect(ctx.__getEvents()).toEqual([]);
  });
});
