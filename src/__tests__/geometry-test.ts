import * as geometry from '../geometry';
import { Point } from '../typings/types';

describe('geometry', () => {
  describe('_extendPointOnLine', () => {
    it('returns a point distance away from the end point', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 8, y: 6 };
      expect(geometry._extendPointOnLine(p1, p2, 5)).toEqual({ x: 12, y: 9 });
    });

    it('works with negative distances', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 8, y: 6 };
      expect(geometry._extendPointOnLine(p1, p2, -5)).toEqual({ x: 4, y: 3 });
    });

    it('works when p2 is before p1 in the line', () => {
      const p1 = { x: 12, y: 9 };
      const p2 = { x: 8, y: 6 };
      expect(geometry._extendPointOnLine(p1, p2, 10)).toEqual({ x: 0, y: 0 });
    });

    it('works with vertical lines', () => {
      const p1 = { x: 2, y: 4 };
      const p2 = { x: 2, y: 6 };
      expect(geometry._extendPointOnLine(p1, p2, 7)).toEqual({ x: 2, y: 13 });
    });

    it('works with vertical lines where p2 is above p1', () => {
      const p1 = { x: 2, y: 6 };
      const p2 = { x: 2, y: 4 };
      expect(geometry._extendPointOnLine(p1, p2, 7)).toEqual({ x: 2, y: -3 });
    });
  });

  describe('frechetDist', () => {
    it('is 0 if the curves are the same', () => {
      const curve1 = [
        { x: 0, y: 0 },
        { x: 4, y: 4 },
      ];
      const curve2 = [
        { x: 0, y: 0 },
        { x: 4, y: 4 },
      ];

      expect(geometry.frechetDist(curve1, curve2)).toBe(0);
      expect(geometry.frechetDist(curve2, curve1)).toBe(0);
    });

    it('less than then max length of any segment if curves are identical', () => {
      const { subdivideCurve, frechetDist } = geometry;
      const curve1 = [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        { x: 4, y: 4 },
      ];
      const curve2 = [
        { x: 0, y: 0 },
        { x: 4, y: 4 },
      ];

      expect(
        frechetDist(subdivideCurve(curve1, 0.5), subdivideCurve(curve2, 0.5)),
      ).toBeLessThan(0.5);
      expect(
        frechetDist(subdivideCurve(curve1, 0.1), subdivideCurve(curve2, 0.1)),
      ).toBeLessThan(0.1);
      expect(
        frechetDist(subdivideCurve(curve1, 0.01), subdivideCurve(curve2, 0.01)),
      ).toBeLessThan(0.01);
    });

    it('will be the dist of the starting points if those are the only difference', () => {
      const curve1 = [
        { x: 1, y: 0 },
        { x: 4, y: 4 },
      ];
      const curve2 = [
        { x: 0, y: 0 },
        { x: 4, y: 4 },
      ];

      expect(geometry.frechetDist(curve1, curve2)).toBe(1);
      expect(geometry.frechetDist(curve2, curve1)).toBe(1);
    });
  });

  describe('subdivideCurve', () => {
    it('leave the curve the same if segment lengths are less than maxLen apart', () => {
      const curve = [
        { x: 0, y: 0 },
        { x: 4, y: 4 },
      ];
      expect(geometry.subdivideCurve(curve, 10)).toEqual([
        { x: 0, y: 0 },
        { x: 4, y: 4 },
      ]);
    });

    it('breaks up segments so that each segment is less than maxLen length', () => {
      const curve = [
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        { x: 0, y: 8 },
      ];
      expect(geometry.subdivideCurve(curve, Math.sqrt(2))).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 4 },
        { x: 3, y: 5 },
        { x: 2, y: 6 },
        { x: 1, y: 7 },
        { x: 0, y: 8 },
      ]);
    });
  });

  describe('outlineCurve', () => {
    it('divides a curve into equally spaced segments', () => {
      const curve1 = [
        { x: 0, y: 0 },
        { x: 4, y: 6 },
      ];
      expect(geometry.outlineCurve(curve1, 3)).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 3 },
        { x: 4, y: 6 },
      ]);

      const curve2 = [
        { x: 0, y: 0 },
        { x: 9, y: 12 },
        { x: 0, y: 24 },
      ];
      expect(geometry.outlineCurve(curve2, 4)).toEqual([
        { x: 0, y: 0 },
        { x: 6, y: 8 },
        { x: 6, y: 16 },
        { x: 0, y: 24 },
      ]);
    });
  });

  describe('_filterParallelPoints', () => {
    it('removes internal points that are on the line connecting the points on either side', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 6, y: 0 },
        { x: 7, y: 1 },
        { x: 8, y: 2 },
        { x: 9, y: 3 },
        { x: 10, y: 3 },
        { x: 11, y: 3 },
      ];
      expect(geometry._filterParallelPoints(points)).toEqual([
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 9, y: 3 },
        { x: 11, y: 3 },
      ]);
    });

    it('returns the original points if there are no parallel points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 9, y: 3 },
        { x: 11, y: 3 },
      ];
      expect(geometry._filterParallelPoints(points)).toEqual(points);
    });
  });

  describe('getPathString', () => {
    it('returns d path based on the points passed in', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 2 },
      ];
      expect(geometry.getPathString(points)).toEqual('M 0 0 L 5 0 L 5 2');
    });

    it('closes the path if close = true', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 2 },
      ];
      expect(geometry.getPathString(points, true)).toEqual('M 0 0 L 5 0 L 5 2Z');
    });

    it('rounds points to 1 decimal point', () => {
      const points = [
        { x: 0.11113, y: 0.991212 },
        { x: 5.4565, y: 0.923 },
        { x: 5.4456, y: 2 },
      ];
      expect(geometry.getPathString(points, true)).toEqual('M 0.1 1 L 5.5 0.9 L 5.4 2Z');
    });
  });

  describe('getVariableWidthOutline', () => {
    /**
     * canvas and SVG fill the pieces of the outline together using the nonzero rule, so a
     * point is filled unless this is 0
     */
    const getWindingNumber = (pt: Point, outline: Point[][]) => {
      let winding = 0;
      for (const poly of outline) {
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i];
          const b = poly[(i + 1) % poly.length];
          const cross = (b.x - a.x) * (pt.y - a.y) - (pt.x - a.x) * (b.y - a.y);
          if (a.y <= pt.y) {
            if (b.y > pt.y && cross > 0) winding++;
          } else if (b.y <= pt.y && cross < 0) {
            winding--;
          }
        }
      }
      return winding;
    };

    /**
     * Points on a grid which should be inside the drawn line but aren't filled. Inside means
     * well within the width of a segment (between its ends), or of a corner between two.
     */
    const getUnfilledPoints = (points: Point[], widths: number[]) => {
      const outline = geometry.getVariableWidthOutline(points, widths);
      const margin = 0.25;
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const maxWidth = Math.max(...widths);
      const unfilled: Point[] = [];
      for (
        let x = Math.min(...xs) - maxWidth;
        x <= Math.max(...xs) + maxWidth;
        x += 0.5
      ) {
        for (
          let y = Math.min(...ys) - maxWidth;
          y <= Math.max(...ys) + maxWidth;
          y += 0.5
        ) {
          const pt = { x: x + 0.013, y: y + 0.007 };
          const isInside = points.some((point, i) => {
            if (
              i > 0 &&
              i < points.length - 1 &&
              geometry.distance(pt, point) < widths[i] / 2 - margin
            ) {
              return true;
            }
            const next = points[i + 1];
            if (!next) return false;
            const seg = geometry.subtract(next, point);
            const t =
              ((pt.x - point.x) * seg.x + (pt.y - point.y) * seg.y) /
              (seg.x * seg.x + seg.y * seg.y);
            if (t <= 0 || t >= 1) return false;
            const foot = { x: point.x + t * seg.x, y: point.y + t * seg.y };
            const halfWidth = (widths[i] + (widths[i + 1] - widths[i]) * t) / 2;
            return geometry.distance(pt, foot) < halfWidth - margin;
          });
          if (isInside && getWindingNumber(pt, outline) === 0) {
            unfilled.push(pt);
          }
        }
      }
      return unfilled;
    };

    it('leaves no gaps at corners of any angle, even where points are closer together than the line is wide', () => {
      const failures: string[] = [];
      for (const segmentLength of [100, 12, 6, 3]) {
        for (const [startWidth, endWidth] of [
          [20, 20],
          [14, 26],
          [26, 14],
        ]) {
          for (let degrees = -175; degrees <= 175; degrees += 5) {
            const angle = (degrees * Math.PI) / 180;
            const points = [
              { x: -segmentLength, y: 0 },
              { x: 0, y: 0 },
              { x: segmentLength * Math.cos(angle), y: segmentLength * Math.sin(angle) },
            ];
            const unfilled = getUnfilledPoints(points, [startWidth, 20, endWidth]);
            if (unfilled.length > 0) {
              failures.push(
                `length ${segmentLength}, widths ${startWidth}-${endWidth}, turn ${degrees}: ${unfilled.length}`,
              );
            }
          }
        }
      }
      expect(failures).toEqual([]);
    });

    it('leaves no gaps in a hook drawn with many closely spaced points', () => {
      const points: Point[] = [];
      const widths: number[] = [];
      // down a straight stroke, then tightly around a hook and back up
      for (let y = 0; y < 60; y += 2) {
        points.push({ x: 0, y });
        widths.push(16 + y / 10);
      }
      for (let i = 0; i <= 12; i++) {
        const angle = Math.PI - (i * Math.PI) / 12;
        points.push({ x: 3 + 3 * Math.cos(angle), y: 60 + 3 * Math.sin(angle) });
        widths.push(22 - i / 2);
      }
      for (let y = 58; y > 40; y -= 2) {
        points.push({ x: 6, y });
        widths.push(14);
      }
      expect(getUnfilledPoints(points, widths)).toEqual([]);
    });

    it('outlines a line which is the requested width at each point', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];
      // 2 wide at the start, 4 wide at the end
      const outline = geometry.getVariableWidthOutline(points, [2, 4]);
      expect(getWindingNumber({ x: 0, y: 0.95 }, outline)).not.toBe(0);
      expect(getWindingNumber({ x: 0, y: 1.05 }, outline)).toBe(0);
      expect(getWindingNumber({ x: 5, y: -1.45 }, outline)).not.toBe(0);
      expect(getWindingNumber({ x: 5, y: -1.6 }, outline)).toBe(0);
      expect(getWindingNumber({ x: 10, y: 1.95 }, outline)).not.toBe(0);
      expect(getWindingNumber({ x: 10, y: 2.05 }, outline)).toBe(0);
      // with round caps at either end
      expect(getWindingNumber({ x: -0.95, y: 0 }, outline)).not.toBe(0);
      expect(getWindingNumber({ x: -1.05, y: 0 }, outline)).toBe(0);
      expect(getWindingNumber({ x: 11.95, y: 0 }, outline)).not.toBe(0);
      expect(getWindingNumber({ x: 12.05, y: 0 }, outline)).toBe(0);
    });

    it('winds every piece of the outline the same way, so overlapping pieces never cancel out', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 1 },
        { x: 0, y: 30 },
      ];
      const outline = geometry.getVariableWidthOutline(points, [2, 6, 3, 8, 1]);
      for (const piece of outline) {
        let signedArea = 0;
        for (let i = 0; i < piece.length; i++) {
          const a = piece[i];
          const b = piece[(i + 1) % piece.length];
          signedArea += a.x * b.y - a.y * b.x;
        }
        expect(signedArea).toBeLessThan(0);
      }
    });

    it('rounds the outside of sharp hooks without overshooting', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 0, y: 5 },
      ];
      const outline = geometry.getVariableWidthOutline(points, [20, 20, 20], 8);
      const maxX = Math.max(...outline.flat().map((p) => p.x));
      expect(maxX).toBeCloseTo(110);

      expect(getWindingNumber({ x: 100, y: 5 }, outline)).not.toBe(0);
      expect(getWindingNumber({ x: 100, y: -5 }, outline)).not.toBe(0);
      expect(getWindingNumber({ x: 105, y: 0 }, outline)).not.toBe(0);
    });

    it('never reaches further from the line than half its width', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 3 },
        { x: 0, y: 2 },
        { x: 20, y: 2 },
      ];
      const widths = [2, 12, 4, 10, 6];
      const outline = geometry.getVariableWidthOutline(points, widths);
      const distanceToSegment = (pt: Point, start: Point, end: Point) => {
        const seg = geometry.subtract(end, start);
        const t = Math.max(
          0,
          Math.min(
            1,
            ((pt.x - start.x) * seg.x + (pt.y - start.y) * seg.y) /
              (seg.x * seg.x + seg.y * seg.y),
          ),
        );
        return geometry.distance(pt, { x: start.x + t * seg.x, y: start.y + t * seg.y });
      };
      for (const point of outline.flat()) {
        const isWithinLine = points
          .slice(1)
          .some(
            (end, i) =>
              distanceToSegment(point, points[i], end) <=
              Math.max(widths[i], widths[i + 1]) / 2 + 1e-9,
          );
        expect(isWithinLine).toBe(true);
      }
    });

    it('draws a dot when there is only one point', () => {
      const outline = geometry.getVariableWidthOutline([{ x: 3, y: 4 }], [6], 4);
      expect(outline.length).toBe(1);
      expect(outline[0].length).toBe(8);
      outline[0].forEach((point) => {
        expect(geometry.distance(point, { x: 3, y: 4 })).toBeCloseTo(3);
      });
    });

    it('draws just the larger circle if it swallows the smaller one', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ];
      const outline = geometry.getVariableWidthOutline(points, [10, 2]);
      expect(getWindingNumber({ x: 4.9, y: 0 }, outline)).not.toBe(0);
      expect(getWindingNumber({ x: 5.1, y: 0 }, outline)).toBe(0);
      expect(getWindingNumber({ x: 0, y: 4.9 }, outline)).not.toBe(0);
    });

    it('merges repeated points, which have no direction to offset along', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];
      expect(geometry.getVariableWidthOutline(points, [1, 2, 4], 2)).toEqual(
        geometry.getVariableWidthOutline(
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          [2, 4],
          2,
        ),
      );
    });

    it('falls back to the last width if fewer widths than points are given', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];
      expect(geometry.getVariableWidthOutline(points, [2], 2)).toEqual(
        geometry.getVariableWidthOutline(points, [2, 2], 2),
      );
    });

    it('returns nothing if there are no points', () => {
      expect(geometry.getVariableWidthOutline([], [])).toEqual([]);
    });
  });
});
