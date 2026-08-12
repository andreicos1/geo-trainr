import { WORLD_TOPOJSON } from "./world-map-topology";
import type { LatLng } from "@/types/game";

/**
 * Real country geometry, decoded from the same Natural Earth topology the
 * world map picker renders. This is what lets the location sampler pick a
 * point *first* and derive its country second: the lookup is local and
 * costs microseconds, so ocean and uncovered land can be rejected without
 * spending a Street View request on them.
 *
 * Deliberately free of any coverage knowledge — `countries-coverage.ts`
 * imports from here, not the other way round.
 */

/** `[south, west, north, east]`, matching the convention used across lib/geo. */
export type Bbox = [south: number, west: number, north: number, east: number];

type Position = [lng: number, lat: number];

const DEG = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;

const {
  scale: [scaleX, scaleY],
  translate: [translateX, translateY],
} = WORLD_TOPOJSON.transform;

/**
 * TopoJSON stores arcs quantized to an integer grid and delta-encoded
 * against the previous point, so decoding is a running sum through the
 * transform. Doing this by hand keeps `topojson-client` (and its missing
 * type definitions) out of the dependency list for ~15 lines of well
 * specified arithmetic.
 */
function decodeArc(arc: number[][]): Position[] {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scaleX + translateX, y * scaleY + translateY];
  });
}

const ARCS = WORLD_TOPOJSON.arcs.map(decodeArc);

/**
 * Stitches a ring's arc indices into one closed list of positions. A
 * negative index `i` means arc `~i` traversed backwards; consecutive arcs
 * share an endpoint, so every arc after the first drops its head.
 */
function buildRing(indices: number[]): Position[] {
  const ring: Position[] = [];
  for (const index of indices) {
    const arc = index < 0 ? [...ARCS[~index]].reverse() : ARCS[index];
    ring.push(...(ring.length === 0 ? arc : arc.slice(1)));
  }
  return ring;
}

/**
 * Natural Earth splits most dateline-crossing shapes at ±180 — the United
 * States' Aleutians and New Zealand's Chathams each arrive as separate
 * polygons either side of the line. Russia's mainland does not: its ring
 * runs straight through, so its longitudes jump from ~180 to ~-180
 * mid-ring. Left alone, that ring's bounding box spans the entire planet
 * and the ray cast is meaningless anywhere near the dateline.
 *
 * Walking the ring and accumulating a ±360 offset at each jump re-expresses
 * it in a single continuous frame (Russia becomes 19°..191°), which the
 * bounding box and the ray cast can then both use directly. The whole ring
 * is then shifted so its western edge lands back in [-180, 180); `east` is
 * left free to exceed 180, and `countryCodeAt` shifts query longitudes to
 * match.
 */
function unwrapAntimeridian(ring: Position[]): Position[] {
  let offset = 0;
  const unwrapped: Position[] = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const delta = ring[i][0] - ring[i - 1][0];
    if (delta > 180) offset -= 360;
    else if (delta < -180) offset += 360;
    unwrapped.push(offset === 0 ? ring[i] : [ring[i][0] + offset, ring[i][1]]);
  }
  if (offset === 0) return unwrapped;

  const west = Math.min(...unwrapped.map(([lng]) => lng));
  const shift = -360 * Math.floor((west + 180) / 360);
  return shift === 0 ? unwrapped : unwrapped.map(([lng, lat]) => [lng + shift, lat]);
}

/** Moves a hole into the same ±360 frame as the outer ring it sits inside. */
function alignToOuter(hole: Position[], outerWest: number): Position[] {
  const west = Math.min(...hole.map(([lng]) => lng));
  const shift = 360 * Math.round((outerWest - west) / 360);
  return shift === 0 ? hole : hole.map(([lng, lat]) => [lng + shift, lat]);
}

interface CountryPolygon {
  code: string;
  /** `rings[0]` is the outer boundary; any others are holes. */
  rings: Position[][];
  bbox: Bbox;
}

function ringsBbox(rings: Position[][]): Bbox {
  let south = 90;
  let west = 180;
  let north = -90;
  let east = -180;
  for (const [lng, lat] of rings[0]) {
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  }
  return [south, west, north, east];
}

function buildPolygons(): CountryPolygon[] {
  const polygons: CountryPolygon[] = [];
  for (const geometry of WORLD_TOPOJSON.objects.countries.geometries) {
    // Natural Earth ships a few shapes with no ISO code (Kosovo, Northern
    // Cyprus, Somaliland). They can't be matched to a coverage entry, so
    // they're skipped and read as ocean — same limitation as the picker.
    if (!geometry.id) continue;
    const parts =
      geometry.type === "Polygon"
        ? [geometry.arcs as number[][]]
        : (geometry.arcs as number[][][]);
    for (const part of parts) {
      const [outer, ...holes] = part.map(buildRing);
      const unwrapped = unwrapAntimeridian(outer);
      const outerWest = Math.min(...unwrapped.map(([lng]) => lng));
      const rings = [unwrapped, ...holes.map((hole) => alignToOuter(hole, outerWest))];
      polygons.push({ code: geometry.id, rings, bbox: ringsBbox(rings) });
    }
  }
  return polygons;
}

const POLYGONS = buildPolygons();

/**
 * Polygons bucketed by whole degree of latitude. `countryCodeAt` is called
 * in a rejection loop — several times per round, and hundreds of thousands
 * of times by the distribution test — so narrowing ~2,000 polygons down to
 * the handful crossing the sampled parallel is worth the ten lines.
 */
const LATITUDE_BANDS = new Map<number, CountryPolygon[]>();
for (const polygon of POLYGONS) {
  const [south, , north] = polygon.bbox;
  for (let band = Math.floor(south); band <= Math.floor(north); band++) {
    const bucket = LATITUDE_BANDS.get(band);
    if (bucket) bucket.push(polygon);
    else LATITUDE_BANDS.set(band, [polygon]);
  }
}

/** Standard even-odd ray cast. `ring` is closed, in `[lng, lat]` order. */
function pointInRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * The ISO 3166-1 numeric code of the country containing this point, or
 * `undefined` for ocean and for the handful of shapes Natural Earth ships
 * without a code. Matches the `code` field on `CountryCoverage` and the
 * `id` on the picker's map features.
 */
export function countryCodeAt(lat: number, lng: number): string | undefined {
  for (const polygon of LATITUDE_BANDS.get(Math.floor(lat)) ?? []) {
    const [south, west, north, east] = polygon.bbox;
    if (lat < south || lat > north) continue;
    // Polygons unwrapped across the antimeridian can extend past 180, so a
    // query in the far west of that frame has to be read as its +360 twin.
    const x = lng < west ? lng + 360 : lng;
    if (x < west || x > east) continue;
    if (!pointInRing(x, lat, polygon.rings[0])) continue;
    let inHole = false;
    for (let i = 1; i < polygon.rings.length; i++) {
      if (pointInRing(x, lat, polygon.rings[i])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return polygon.code;
  }
  return undefined;
}

/**
 * Merges longitude ranges around the globe and returns the arc that covers
 * them all — found as the complement of the widest gap between them.
 *
 * A plain min/max would be wrong for the three covered countries whose
 * territory crosses the antimeridian (Russia, the United States via the
 * Aleutians, New Zealand via the Chathams): their polygons sit at both
 * ±180, so min/max reports a full -180..180 span and would treat each as
 * wrapping the entire planet. The returned `east` may exceed 180 to
 * express a range that crosses the antimeridian — `randomPointByArea`
 * normalizes it back, and the haversine in scoring.ts is already periodic
 * in longitude, so both handle it without special-casing.
 */
function coveringLongitudeArc(ranges: [west: number, east: number][]): [number, number] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [west, east] of sorted) {
    const last = merged[merged.length - 1];
    if (last && west <= last[1]) last[1] = Math.max(last[1], east);
    else merged.push([west, east]);
  }

  // The widest gap is the part of the circle the country doesn't occupy;
  // everything else, read eastward, is the covering arc.
  let gapStart = merged[merged.length - 1][1];
  let gapEnd = merged[0][0] + 360;
  let widest = gapEnd - gapStart;
  for (let i = 1; i < merged.length; i++) {
    const gap = merged[i][0] - merged[i - 1][1];
    if (gap > widest) {
      widest = gap;
      gapStart = merged[i - 1][1];
      gapEnd = merged[i][0];
    }
  }
  // `gapEnd` only exceeds 180 when the widest gap is the one spanning the
  // antimeridian, in which case the covering arc is the plain min/max.
  if (gapEnd > 180) return [gapEnd - 360, gapStart];
  return [gapEnd, gapStart + 360];
}

/**
 * How far a landmass may sit from its country's main one and still count as
 * part of that country's play area.
 *
 * Natural Earth files far-flung dependencies under their parent country, so
 * "France" also means Réunion, Mayotte, Guadeloupe, Martinique and French
 * Guiana — together 12.4% of the feature's area, nearly all of it French
 * Guiana. Taken literally that puts 1 in 7 France rounds in South America or
 * the Indian Ocean, and stretches Europe's scoring diagonal to 12,953km,
 * wider than Asia's.
 *
 * The measured separations leave a clean gap to cut in: the furthest
 * landmass that is uncontroversially part of its country is the end of the
 * Aleutian chain at 4,872km, while the nearest overseas department is
 * Guadeloupe at 6,069km. 5,500km splits them, keeping Alaska, Hawaii, the
 * Canaries, the Azores, Madeira, Svalbard, the Galápagos and Easter Island
 * while dropping the French and Dutch holdings on other continents.
 */
const MAX_LANDMASS_SEPARATION_KM = 5_500;

/** Rough great-circle gap between two boxes; 0 when they touch or overlap. */
function bboxSeparationKm(a: Bbox, b: Bbox): number {
  const latGap = Math.max(0, a[0] - b[2], b[0] - a[2]);
  const centreGap = Math.abs((((((a[1] + a[3]) / 2 - (b[1] + b[3]) / 2) % 360) + 540) % 360) - 180);
  const lngGap = Math.max(0, centreGap - (a[3] - a[1] + (b[3] - b[1])) / 2);
  const meanLat = ((a[0] + a[2]) / 2 + (b[0] + b[2]) / 2) / 2;
  return Math.hypot(
    latGap * DEG * EARTH_RADIUS_KM,
    lngGap * DEG * EARTH_RADIUS_KM * Math.cos(meanLat * DEG),
  );
}

/**
 * A country's landmasses, minus any distant dependency. Drives both where
 * rounds are sampled and how big the play area is for scoring, so the two
 * can never disagree. `countryCodeAt` deliberately still knows about the
 * dropped territories — they're just not somewhere a round can land.
 */
const POLYGONS_BY_CODE = new Map<string, CountryPolygon[]>();
for (const polygon of POLYGONS) {
  const bucket = POLYGONS_BY_CODE.get(polygon.code);
  if (bucket) bucket.push(polygon);
  else POLYGONS_BY_CODE.set(polygon.code, [polygon]);
}
for (const [code, polygons] of POLYGONS_BY_CODE) {
  if (polygons.length === 1) continue;
  const bboxSpan = ([south, west, north, east]: Bbox) =>
    (Math.sin(north * DEG) - Math.sin(south * DEG)) * (east - west);
  const main = polygons.reduce((a, b) => (bboxSpan(a.bbox) >= bboxSpan(b.bbox) ? a : b));
  POLYGONS_BY_CODE.set(
    code,
    polygons.filter((p) => bboxSeparationKm(p.bbox, main.bbox) <= MAX_LANDMASS_SEPARATION_KM),
  );
}

const BBOX_BY_CODE = new Map<string, Bbox>();
for (const [code, polygons] of POLYGONS_BY_CODE) {
  const [west, east] = coveringLongitudeArc(
    polygons.map((p): [number, number] => [p.bbox[1], p.bbox[3]]),
  );
  BBOX_BY_CODE.set(code, [
    Math.min(...polygons.map((p) => p.bbox[0])),
    west,
    Math.max(...polygons.map((p) => p.bbox[2])),
    east,
  ]);
}

/** The bounding box of a country's real borders, or `undefined` if unknown. */
export function countryBbox(code: string): Bbox | undefined {
  const bbox = BBOX_BY_CODE.get(code);
  return bbox ? ([...bbox] as Bbox) : undefined;
}

/**
 * One individual landmass — the unit the location sampler draws from.
 * Opaque on purpose: callers pick one, sample inside its `bbox`, and ask
 * `areaContains` whether the point stuck.
 */
export interface SamplingArea {
  readonly code: string;
  readonly bbox: Bbox;
}

/**
 * Every landmass belonging to these countries.
 *
 * Per-landmass rather than per-country because a country's own box can be
 * mostly water: an archipelago like the Maldives or the Bahamas occupies a
 * fraction of a percent of its bounding box, so nearly every sample inside
 * it would be thrown away. Individual landmass boxes hug the actual land.
 */
export function samplingAreasFor(codes: Iterable<string>): SamplingArea[] {
  const areas: SamplingArea[] = [];
  for (const code of codes) {
    for (const polygon of POLYGONS_BY_CODE.get(code) ?? []) areas.push(polygon);
  }
  return areas;
}

/**
 * Whether a point lies on *this specific* landmass.
 *
 * Testing against the drawn area rather than asking `countryCodeAt` which
 * country the point is in is what keeps the draw honest. Bounding boxes
 * overlap heavily — Kazakhstan and Mongolia sit inside Russia's box, Bolivia
 * and Peru inside Brazil's — so a shared point would be reachable through
 * several boxes and those countries would come up far more often than their
 * size warrants (measured at 60-98% over-weighted before this check).
 *
 * Accepting only points that land on the box's own landmass makes the
 * chance of drawing it `area(bbox) × area(land)/area(bbox)`, which is just
 * `area(land)` — exactly proportional to real land area, however much the
 * boxes overlap.
 */
export function areaContains(area: SamplingArea, lat: number, lng: number): boolean {
  const polygon = area as CountryPolygon;
  const [south, west, north, east] = polygon.bbox;
  if (lat < south || lat > north) return false;
  const x = lng < west ? lng + 360 : lng;
  if (x < west || x > east) return false;
  if (!pointInRing(x, lat, polygon.rings[0])) return false;
  for (let i = 1; i < polygon.rings.length; i++) {
    if (pointInRing(x, lat, polygon.rings[i])) return false;
  }
  return true;
}

/** The smallest box containing every given box, antimeridian-aware. */
export function unionBbox(boxes: Bbox[]): Bbox {
  const south = Math.min(...boxes.map((b) => b[0]));
  const north = Math.max(...boxes.map((b) => b[2]));
  const [west, east] = coveringLongitudeArc(boxes.map((b): [number, number] => [b[1], b[3]]));
  return [south, west, north, east];
}

/**
 * A point drawn uniformly *by area* from a box. Latitude is sampled
 * uniformly in `sin(lat)` rather than in degrees: a degree of latitude near
 * the poles covers far less ground than one at the equator, so sampling
 * degrees directly would pull rounds towards Scandinavia and northern
 * Canada. Longitude is normalized back into [-180, 180] for boxes that
 * cross the antimeridian.
 */
export function randomPointByArea([south, west, north, east]: Bbox): LatLng {
  const sinSouth = Math.sin(south * DEG);
  const sinNorth = Math.sin(north * DEG);
  const lat = Math.asin(sinSouth + Math.random() * (sinNorth - sinSouth)) / DEG;
  const lng = west + Math.random() * (east - west);
  return { lat, lng: lng > 180 ? lng - 360 : lng };
}
