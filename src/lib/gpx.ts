/**
 * What a route map needs out of a GPX file, worked out at build time so the
 * page ships numbers and a polyline rather than a 60kB XML document and the
 * code to read it.
 *
 * Only `<trk>` is read. A GPX file can also hold `<rte>` (a route as a list of
 * turns) and `<wpt>` (loose points); neither is a line on the ground, which is
 * the only thing drawn here.
 */

export interface RouteStats {
  /** metres along the ground, summed inside each segment */
  distance: number;
  /** metres climbed and dropped, past the noise threshold */
  ascent: number;
  descent: number;
  low: number;
  high: number;
}

export interface Route extends RouteStats {
  name?: string;
  /**
   * `[lat, lon]` pairs, one array per track segment. A track that stops and
   * starts again — a boat leg, a gap in the trace — leaves a gap in the drawn
   * line rather than a straight cut across the map.
   */
  segments: [number, number][][];
  /** `[[south, west], [north, east]]`, the box the map opens on */
  bounds: [[number, number], [number, number]];
}

export interface ParseOptions {
  /**
   * How far a point may sit off the line between its neighbours before the
   * line has to bend for it, in metres. 4m is under a pixel at the zoom a
   * whole day's walk is looked at, and roughly halves a typical track.
   */
  tolerance?: number;
  /**
   * How far elevation must move in one direction before it counts as climb
   * rather than the wobble of a barometer or a terrain model, in metres.
   * Without it every flat kilometre quietly adds a few dozen metres of ascent.
   */
  threshold?: number;
  /** decimal places kept per coordinate; 5 is a little over a metre */
  precision?: number;
  /**
   * Walk the track the other way. A published route is stored in whichever
   * direction its author drew it, which is not always the direction it was
   * walked; reversing here rather than at the end means the climb figures and
   * the start and finish of the line all come out of the same pass and agree.
   */
  reverse?: boolean;
}

type Point = { lat: number; lon: number; ele: number | null };

const EARTH_RADIUS = 6371008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** great-circle metres between two points */
function haversine(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

const TRKSEG = /<trkseg\b[^>]*>([\s\S]*?)<\/trkseg>/g;
const TRKPT = /<trkpt\b([^>]*)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;
const LAT = /\blat\s*=\s*"([^"]+)"/;
const LON = /\blon\s*=\s*"([^"]+)"/;
const ELE = /<ele>\s*([-\d.eE+]+)\s*<\/ele>/;
const NAME = /<metadata\b[\s\S]*?<name>([\s\S]*?)<\/name>/;

function readSegments(xml: string): Point[][] {
  const segments: Point[][] = [];
  for (const [, body] of xml.matchAll(TRKSEG)) {
    const points: Point[] = [];
    for (const [, attrs, inner = ''] of body.matchAll(TRKPT)) {
      const lat = Number(attrs.match(LAT)?.[1]);
      const lon = Number(attrs.match(LON)?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const ele = Number(inner.match(ELE)?.[1]);
      points.push({ lat, lon, ele: Number.isFinite(ele) ? ele : null });
    }
    if (points.length > 0) segments.push(points);
  }
  return segments;
}

/**
 * Climb and drop, counted only once a run of points has moved `threshold`
 * metres the same way. The reference resets to wherever the move ended, so a
 * long steady climb is counted in full and a jittery flat is counted as flat.
 */
function elevation(points: Point[], threshold: number) {
  const known = points.filter((p): p is Point & { ele: number } => p.ele !== null);
  if (known.length === 0) return { ascent: 0, descent: 0, low: NaN, high: NaN };

  let ascent = 0;
  let descent = 0;
  let reference = known[0].ele;
  let low = reference;
  let high = reference;

  for (const { ele } of known) {
    if (ele - reference > threshold) {
      ascent += ele - reference;
      reference = ele;
    } else if (reference - ele > threshold) {
      descent += reference - ele;
      reference = ele;
    }
    if (ele < low) low = ele;
    if (ele > high) high = ele;
  }

  return { ascent, descent, low, high };
}

/**
 * Ramer–Douglas–Peucker, on a local flat projection: over a single track the
 * metres-per-degree either way are constant enough that the perpendicular
 * distances it compares are true to within far less than the tolerance.
 * Iterative rather than recursive so that a long trace cannot blow the stack.
 */
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;

  const lat0 = rad(points[0].lat);
  const x = points.map(p => p.lon * 111320 * Math.cos(lat0));
  const y = points.map(p => p.lat * 110540);

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    if (last - first < 2) continue;

    const dx = x[last] - x[first];
    const dy = y[last] - y[first];
    const span = Math.hypot(dx, dy);

    let farthest = -1;
    let worst = tolerance;
    for (let i = first + 1; i < last; i++) {
      // perpendicular distance to the chord, or to the point the chord
      // collapsed to when the segment starts and ends in the same place
      const distance =
        span === 0
          ? Math.hypot(x[i] - x[first], y[i] - y[first])
          : Math.abs(dy * (x[i] - x[first]) - dx * (y[i] - y[first])) / span;
      if (distance > worst) {
        worst = distance;
        farthest = i;
      }
    }

    if (farthest === -1) continue;
    keep[farthest] = 1;
    stack.push([first, farthest], [farthest, last]);
  }

  return points.filter((_, i) => keep[i] === 1);
}

export function parseGpx(xml: string, options: ParseOptions = {}): Route {
  const { tolerance = 4, threshold = 3, precision = 5, reverse = false } = options;

  const raw = readSegments(xml);
  if (raw.length === 0) throw new Error('GPX file holds no track points');
  if (reverse) {
    raw.reverse();
    for (const points of raw) points.reverse();
  }

  let distance = 0;
  let ascent = 0;
  let descent = 0;
  let low = Infinity;
  let high = -Infinity;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;

  for (const points of raw) {
    for (let i = 1; i < points.length; i++) distance += haversine(points[i - 1], points[i]);

    const climb = elevation(points, threshold);
    ascent += climb.ascent;
    descent += climb.descent;
    if (climb.low < low) low = climb.low;
    if (climb.high > high) high = climb.high;

    for (const { lat, lon } of points) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lon < west) west = lon;
      if (lon > east) east = lon;
    }
  }

  const round = (n: number) => Number(n.toFixed(precision));
  const segments = raw.map(points =>
    simplify(points, tolerance).map(p => [round(p.lat), round(p.lon)] as [number, number])
  );

  return {
    name: xml.match(NAME)?.[1].trim() || undefined,
    segments,
    distance,
    ascent,
    descent,
    low: Number.isFinite(low) ? low : 0,
    high: Number.isFinite(high) ? high : 0,
    bounds: [
      [south, west],
      [north, east],
    ],
  };
}
