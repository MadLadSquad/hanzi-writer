import { Point } from './typings/types';
import { average, arrLast } from './utils';

export const subtract = (p1: Point, p2: Point) => ({ x: p1.x - p2.x, y: p1.y - p2.y });

export const magnitude = (point: Point) =>
  Math.sqrt(Math.pow(point.x, 2) + Math.pow(point.y, 2));

export const distance = (point1: Point, point2: Point) =>
  magnitude(subtract(point1, point2));

export const equals = (point1: Point, point2: Point) =>
  point1.x === point2.x && point1.y === point2.y;

export const round = (point: Point, precision = 1) => {
  const multiplier = precision * 10;
  return {
    x: Math.round(multiplier * point.x) / multiplier,
    y: Math.round(multiplier * point.y) / multiplier,
  };
};

export const length = (points: Point[]) => {
  let lastPoint = points[0];
  const pointsSansFirst = points.slice(1);
  return pointsSansFirst.reduce((acc, point) => {
    const dist = distance(point, lastPoint);
    lastPoint = point;
    return acc + dist;
  }, 0);
};

export const cosineSimilarity = (point1: Point, point2: Point) => {
  const rawDotProduct = point1.x * point2.x + point1.y * point2.y;
  return rawDotProduct / magnitude(point1) / magnitude(point2);
};

/**
 * return a new point, p3, which is on the same line as p1 and p2, but distance away
 * from p2. p1, p2, p3 will always lie on the line in that order
 */
export const _extendPointOnLine = (p1: Point, p2: Point, dist: number) => {
  const vect = subtract(p2, p1);
  const norm = dist / magnitude(vect);
  return { x: p2.x + norm * vect.x, y: p2.y + norm * vect.y };
};

/** based on http://www.kr.tuwien.ac.at/staff/eiter/et-archive/cdtr9464.pdf */
export const frechetDist = (curve1: Point[], curve2: Point[]) => {
  const longCurve = curve1.length >= curve2.length ? curve1 : curve2;
  const shortCurve = curve1.length >= curve2.length ? curve2 : curve1;

  const calcVal = (
    i: number,
    j: number,
    prevResultsCol: number[],
    curResultsCol: number[],
  ): number => {
    if (i === 0 && j === 0) {
      return distance(longCurve[0], shortCurve[0]);
    }

    if (i > 0 && j === 0) {
      return Math.max(prevResultsCol[0], distance(longCurve[i], shortCurve[0]));
    }

    const lastResult = curResultsCol[curResultsCol.length - 1];

    if (i === 0 && j > 0) {
      return Math.max(lastResult, distance(longCurve[0], shortCurve[j]));
    }

    return Math.max(
      Math.min(prevResultsCol[j], prevResultsCol[j - 1], lastResult),
      distance(longCurve[i], shortCurve[j]),
    );
  };

  let prevResultsCol: number[] = [];
  for (let i = 0; i < longCurve.length; i++) {
    const curResultsCol: number[] = [];
    for (let j = 0; j < shortCurve.length; j++) {
      // we only need the results from i - 1 and j - 1 to continue the calculation
      // so we only need to hold onto the last column of calculated results
      // prevResultsCol is results[i-1][:] in the original algorithm
      // curResultsCol is results[i][:j-1] in the original algorithm
      curResultsCol.push(calcVal(i, j, prevResultsCol, curResultsCol));
    }
    prevResultsCol = curResultsCol;
  }

  return prevResultsCol[shortCurve.length - 1];
};

/** break up long segments in the curve into smaller segments of len maxLen or smaller */
export const subdivideCurve = (curve: Point[], maxLen = 0.05) => {
  const newCurve = curve.slice(0, 1);

  for (const point of curve.slice(1)) {
    const prevPoint = newCurve[newCurve.length - 1];
    const segLen = distance(point, prevPoint);
    if (segLen > maxLen) {
      const numNewPoints = Math.ceil(segLen / maxLen);
      const newSegLen = segLen / numNewPoints;
      for (let i = 0; i < numNewPoints; i++) {
        newCurve.push(_extendPointOnLine(point, prevPoint, -1 * newSegLen * (i + 1)));
      }
    } else {
      newCurve.push(point);
    }
  }

  return newCurve;
};

/** redraw the curve using numPoints equally spaced out along the length of the curve */
export const outlineCurve = (curve: Point[], numPoints = 30) => {
  const curveLen = length(curve);
  const segmentLen = curveLen / (numPoints - 1);
  const outlinePoints = [curve[0]];
  const endPoint = arrLast(curve);
  const remainingCurvePoints = curve.slice(1);

  for (let i = 0; i < numPoints - 2; i++) {
    let lastPoint: Point = arrLast(outlinePoints);
    let remainingDist = segmentLen;
    let outlinePointFound = false;
    while (!outlinePointFound) {
      const nextPointDist = distance(lastPoint, remainingCurvePoints[0]);
      if (nextPointDist < remainingDist) {
        remainingDist -= nextPointDist;
        lastPoint = remainingCurvePoints.shift()!;
      } else {
        const nextPoint = _extendPointOnLine(
          lastPoint,
          remainingCurvePoints[0],
          remainingDist - nextPointDist,
        );
        outlinePoints.push(nextPoint);
        outlinePointFound = true;
      }
    }
  }

  outlinePoints.push(endPoint);

  return outlinePoints;
};

/** translate and scale from https://en.wikipedia.org/wiki/Procrustes_analysis */
export const normalizeCurve = (curve: Point[]) => {
  const outlinedCurve = outlineCurve(curve);
  const meanX = average(outlinedCurve.map((point) => point.x));
  const meanY = average(outlinedCurve.map((point) => point.y));
  const mean = { x: meanX, y: meanY };
  const translatedCurve = outlinedCurve.map((point) => subtract(point, mean));
  const scale = Math.sqrt(
    average([
      Math.pow(translatedCurve[0].x, 2) + Math.pow(translatedCurve[0].y, 2),
      Math.pow(arrLast(translatedCurve).x, 2) + Math.pow(arrLast(translatedCurve).y, 2),
    ]),
  );
  const scaledCurve = translatedCurve.map((point) => ({
    x: point.x / scale,
    y: point.y / scale,
  }));
  return subdivideCurve(scaledCurve);
};

/** rotate a single vector around the origin by theta radians */
export const rotateVector = (vect: Point, theta: number) => {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: cos * vect.x - sin * vect.y,
    y: sin * vect.x + cos * vect.y,
  };
};

// rotate around the origin
export const rotate = (curve: Point[], theta: number) => {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return curve.map((point) => ({
    x: cos * point.x - sin * point.y,
    y: sin * point.x + cos * point.y,
  }));
};

// remove intermediate points that are on the same line as the points to either side
export const _filterParallelPoints = (points: Point[]) => {
  if (points.length < 3) return points;
  const filteredPoints = [points[0], points[1]];
  points.slice(2).forEach((point) => {
    const numFilteredPoints = filteredPoints.length;
    const curVect = subtract(point, filteredPoints[numFilteredPoints - 1]);
    const prevVect = subtract(
      filteredPoints[numFilteredPoints - 1],
      filteredPoints[numFilteredPoints - 2],
    );
    // this is the z coord of the cross-product. If this is 0 then they're parallel
    const isParallel = curVect.y * prevVect.x - curVect.x * prevVect.y === 0;
    if (isParallel) {
      filteredPoints.pop();
    }
    filteredPoints.push(point);
  });
  return filteredPoints;
};

export function getPathString(points: Point[], close = false) {
  const start = round(points[0]);
  const remainingPoints = points.slice(1);
  let pathString = `M ${start.x} ${start.y}`;
  remainingPoints.forEach((point) => {
    const roundedPoint = round(point);
    pathString += ` L ${roundedPoint.x} ${roundedPoint.y}`;
  });
  if (close) {
    pathString += 'Z';
  }
  return pathString;
}

/** take points on a path and move their start point backwards by distance */
export const extendStart = (points: Point[], dist: number) => {
  const filteredPoints = _filterParallelPoints(points);
  if (filteredPoints.length < 2) return filteredPoints;
  const p1 = filteredPoints[1];
  const p2 = filteredPoints[0];
  const newStart = _extendPointOnLine(p1, p2, dist);
  const extendedPoints = filteredPoints.slice(1);
  extendedPoints.unshift(newStart);
  return extendedPoints;
};

const add = (p1: Point, p2: Point) => ({ x: p1.x + p2.x, y: p1.y + p2.y });

const scaleVector = (vect: Point, scale: number) => ({
  x: vect.x * scale,
  y: vect.y * scale,
});

/** the vector perpendicular to `vect`, rotated a quarter turn counter-clockwise */
const perpendicular = (vect: Point) => ({ x: -vect.y, y: vect.x });

const cross = (v1: Point, v2: Point) => v1.x * v2.y - v1.y * v2.x;

const dot = (v1: Point, v2: Point) => v1.x * v2.x + v1.y * v2.y;

/** number of segments used to draw each half circle of a variable-width stroke */
const CAP_SEGMENTS = 8;

/** points around a full circle, going clockwise */
const circleOutline = (center: Point, radius: number, segments: number) => {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    points.push(
      add(center, rotateVector({ x: radius, y: 0 }, (-2 * Math.PI * i) / segments)),
    );
  }
  return points;
};

/** twice the signed area of the polygon, positive if it winds counter-clockwise */
const signedArea = (polygon: Point[]) => {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    area += cross(polygon[i], polygon[(i + 1) % polygon.length]);
  }
  return area;
};

/** the polygon, reversed if needed so it winds clockwise like every other piece */
const clockwise = (polygon: Point[]) =>
  signedArea(polygon) > 0 ? polygon.reverse() : polygon;

/**
 * Directions from the start and end of a segment to where the line drawn along it touches
 * the circles drawn at either end, on its left and right sides. If one circle sits entirely
 * inside the other, there's nothing to join, so this returns null.
 */
const getSegmentTangents = (
  start: Point,
  end: Point,
  startRadius: number,
  endRadius: number,
) => {
  const vect = subtract(end, start);
  const length = magnitude(vect);
  const sinAngle = (startRadius - endRadius) / length;
  if (Math.abs(sinAngle) >= 1) {
    return null;
  }
  const dir = scaleVector(vect, 1 / length);
  const normal = scaleVector(perpendicular(dir), Math.sqrt(1 - sinAngle * sinAngle));
  // as the line narrows, the points where it touches the circles tilt towards the smaller one
  const forward = scaleVector(dir, sinAngle);
  return { dir, sinAngle, left: add(normal, forward), right: subtract(forward, normal) };
};

/**
 * The part of `polygon` (which must be convex) where `getDistance` is at least 0, using the
 * Sutherland-Hodgman algorithm. `getDistance` must be linear, i.e. measure the signed
 * distance from a straight line.
 */
const clipPolygon = (polygon: Point[], getDistance: (point: Point) => number) => {
  const clipped: Point[] = [];
  polygon.forEach((point, i) => {
    const next = polygon[(i + 1) % polygon.length];
    const distance = getDistance(point);
    const nextDistance = getDistance(next);
    if (distance >= 0) {
      clipped.push(point);
    }
    if (distance >= 0 !== nextDistance >= 0) {
      const t = distance / (distance - nextDistance);
      clipped.push(add(point, scaleVector(subtract(next, point), t)));
    }
  });
  return clipped;
};

/**
 * Build the outline of a line through `points`, where the line is `widths[i]` wide at
 * `points[i]`, with round caps and corners. Filling this draws a line whose width varies
 * along its length, which isn't something a plain stroked path can do.
 *
 * The outline is made of several convex polygons, which overlap where the line bends: one
 * along each segment (the hull of the circles at either end), the part of the circle at each
 * corner which those leave uncovered (rounding off the outside of a bend) and a circle at
 * either end. They all wind the same way, so filling them together with the nonzero rule (the
 * default for both canvas and SVG) fills everywhere any of them covers, without gaps or holes
 * however sharply the line turns or quickly its width changes, and without darkening where
 * they overlap.
 */
export const getVariableWidthOutline = (
  points: Point[],
  widths: number[],
  capSegments = CAP_SEGMENTS,
): Point[][] => {
  if (points.length === 0) return [];

  // zero-length segments have no direction to offset along, so merge them into a single point
  const curve: Point[] = [];
  const radii: number[] = [];
  points.forEach((point, i) => {
    const radius = Math.max(widths[i] ?? arrLast(widths) ?? 0, 0) / 2;
    if (curve.length > 0 && equals(arrLast(curve), point)) {
      radii[radii.length - 1] = Math.max(arrLast(radii), radius);
      return;
    }
    curve.push(point);
    radii.push(radius);
  });

  const lastIndex = curve.length - 1;
  const pieces: Point[][] = [circleOutline(curve[0], radii[0], 2 * capSegments)];
  if (lastIndex === 0) {
    return pieces;
  }

  const tangents = curve
    .slice(1)
    .map((point, i) => getSegmentTangents(curve[i], point, radii[i], radii[i + 1]));

  tangents.forEach((segmentTangents, i) => {
    if (!segmentTangents) return;
    const { left, right } = segmentTangents;
    const [start, end] = [curve[i], curve[i + 1]];
    const [startRadius, endRadius] = [radii[i], radii[i + 1]];
    pieces.push(
      clockwise([
        add(start, scaleVector(left, startRadius)),
        add(end, scaleVector(left, endRadius)),
        add(end, scaleVector(right, endRadius)),
        add(start, scaleVector(right, startRadius)),
      ]),
    );
  });

  for (let i = 1; i < lastIndex; i++) {
    const incoming = tangents[i - 1];
    const outgoing = tangents[i];
    if (!incoming || !outgoing) {
      // a segment on one side is swallowed by the circles at its ends, so draw the whole circle
      pieces.push(circleOutline(curve[i], radii[i], 2 * capSegments));
      continue;
    }
    // The segment pieces on either side each cover the circle here up to a straight edge
    // across the line (through where their sides touch the circle). Whatever lies past the
    // end of one and before the start of the other is left for the corner piece to fill: the
    // outside of a bend, or a sliver where the width changes how quickly it's growing.
    const center = curve[i];
    const radius = radii[i];
    const corner = clipPolygon(
      clipPolygon(
        circleOutline(center, radius, 2 * capSegments),
        (point) =>
          dot(subtract(point, center), incoming.dir) - radius * incoming.sinAngle,
      ),
      (point) => radius * outgoing.sinAngle - dot(subtract(point, center), outgoing.dir),
    );
    // where the line carries straight on, nothing (or a sliver of no width) is left over
    if (corner.length >= 3 && Math.abs(signedArea(corner)) > 1e-6 * radius * radius) {
      pieces.push(corner);
    }
  }

  pieces.push(circleOutline(curve[lastIndex], radii[lastIndex], 2 * capSegments));
  return pieces;
};

/** SVG path string for every polygon of a variable-width outline, filled as one shape */
export const getOutlinePathString = (outline: Point[][]) =>
  outline.map((polygon) => getPathString(polygon, true)).join(' ');
