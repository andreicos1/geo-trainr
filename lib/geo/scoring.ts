import type { GameScope, LatLng } from "@/types/game";
import { MAX_SCORE_PER_ROUND } from "@/types/game";

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
 * Distance-decay scale (km) for the scoring curve. A tighter scale for
 * small-area scopes keeps single-country games from collapsing to
 * near-max scores for everyone.
 */
export function scaleForScope(scope: GameScope): number {
  if (scope.type === "country") return 200;
  if (scope.type === "continent") return 1500;
  return 2000; // globe
}

/** GeoGuessr-style exponential decay score, capped to [0, MAX_SCORE_PER_ROUND]. */
export function scoreFromDistance(distanceKm: number, scale: number): number {
  const raw = MAX_SCORE_PER_ROUND * Math.exp(-distanceKm / scale);
  return Math.round(Math.max(0, Math.min(MAX_SCORE_PER_ROUND, raw)));
}
