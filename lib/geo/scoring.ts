import type { GameScope, LatLng } from "@/types/game";
import { MAX_SCORE_PER_ROUND } from "@/types/game";
import {
  COUNTRY_COVERAGE,
  getCountriesForContinent,
  getCountry,
  type CountryCoverage,
} from "@/lib/geo/countries-coverage";

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points, in kilometers. */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
}

/**
 * GeoGuessr's real scoring curve (reverse-engineered — see
 * https://latb.io/geoguessr/articles/the-maths) is:
 *
 *   S = 5000 * exp(-10 * d / D)
 *
 * where `d` is the guess distance and `D` is the diagonal distance across
 * the play area's bounding box. `D` — not a fixed radius — is what makes a
 * single small country and the whole globe grade on different curves with
 * the same formula: a tighter box makes the same `d` a bigger fraction of
 * `D`, so it costs more points.
 */
const SCORE_DECAY_CONSTANT = 10;

/** Guesses this close always score max, mirroring GeoGuessr's own floor for near-perfect pins. */
const PERFECT_GUESS_RADIUS_KM = 0.025;

type BBox = [south: number, west: number, north: number, east: number];

function unionBoundingBox(boxes: BBox[]): BBox {
  let [south, west, north, east] = boxes[0];
  for (const box of boxes.slice(1)) {
    south = Math.min(south, box[0]);
    west = Math.min(west, box[1]);
    north = Math.max(north, box[2]);
    east = Math.max(east, box[3]);
  }
  return [south, west, north, east];
}

/**
 * The bounding box(es) that best represent a scope's real play area for
 * scoring — each country's `extentBbox` when set (its real geographic
 * extent), falling back to its coverage `bboxes` otherwise. Deliberately
 * *not* the same boxes the random-location sampler draws from: those are
 * narrow city-level clusters for many large countries, and scoring against
 * them would make guesses in, say, India or Brazil score far harsher than
 * GeoGuessr does for the same distance. See countries-coverage.ts.
 */
function boxesForScope(scope: GameScope): BBox[] {
  const box = (c: CountryCoverage): BBox[] => (c.extentBbox ? [c.extentBbox] : c.bboxes);
  if (scope.type === "country") {
    const country = getCountry(scope.code);
    return country ? box(country) : [];
  }
  if (scope.type === "continent") return getCountriesForContinent(scope.code).flatMap(box);
  return COUNTRY_COVERAGE.flatMap(box);
}

/**
 * Diagonal distance (km) across a scope's play area — GeoGuessr's `D`.
 * Computed as the great-circle distance between the corners of the union of
 * that scope's coverage bounding boxes.
 */
export function mapDiagonalKm(scope: GameScope): number {
  const boxes = boxesForScope(scope);
  if (boxes.length === 0) return 20015; // fallback: half the Earth's circumference
  const [south, west, north, east] = unionBoundingBox(boxes);
  return haversineDistanceKm({ lat: south, lng: west }, { lat: north, lng: east });
}

/** GeoGuessr-style exponential decay score, capped to [0, MAX_SCORE_PER_ROUND]. */
export function scoreFromDistance(distanceKm: number, diagonalKm: number): number {
  if (distanceKm <= PERFECT_GUESS_RADIUS_KM) return MAX_SCORE_PER_ROUND;
  const raw = MAX_SCORE_PER_ROUND * Math.exp((-SCORE_DECAY_CONSTANT * distanceKm) / diagonalKm);
  return Math.round(Math.max(0, Math.min(MAX_SCORE_PER_ROUND, raw)));
}
