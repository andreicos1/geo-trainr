import type { GameScope, LatLng } from "@/types/game";
import { MAX_SCORE_PER_ROUND } from "@/types/game";
import {
  COUNTRY_COVERAGE,
  getCountriesForContinent,
  getCountry,
  type CountryCoverage,
} from "@/lib/geo/countries-coverage";
import { playAreaSpreadKm } from "@/lib/geo/country-shapes";

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
 * The curve is GeoGuessr's — an exponential decay in guess distance —
 * expressed through the distance at which a round scores half marks:
 *
 *   S = 5000 * 2^(-d / h)
 *
 * On the world map GeoGuessr halves at roughly a thousand kilometres, which
 * is what this anchors to; the rest of the file is about deriving `h` for a
 * smaller play area.
 */
const GLOBE_HALF_SCORE_KM = 1050;

/**
 * How much a smaller play area tightens the curve.
 *
 * GeoGuessr normalizes distance by the map's own size, i.e. this exponent is
 * 1: a map a tenth the size wants guesses ten times tighter for the same
 * score. That is what made country rounds feel broken here. A small
 * country's spread is barely 1% of the globe's, so the Netherlands demanded
 * 9km accuracy for the 4,000 points that 345km earns on the world map, and
 * a guess landing at the right end of the country, 100km out, scored 445.
 *
 * Dropping the exponent below 1 lets some of the world curve's forgiveness
 * survive into small maps. At 0.7 the Netherlands halves at 51km rather than
 * 29km: 25km out is worth 3,570 instead of 2,731, that same 100km guess
 * 1,299 instead of 445, and a blind in-country guess ~1,100 instead of ~350
 * — while pin-perfect play is still what separates 4,500 from 5,000. Globe
 * scope is untouched (its own ratio is 1 under any exponent) and continents
 * are nudged only slightly.
 *
 * Lower it to be gentler still, raise it towards 1 for GeoGuessr's own
 * (brutal, on a country map) grading.
 */
const SCALE_EXPONENT = 0.7;

/** Guesses this close always score max, mirroring GeoGuessr's own floor for near-perfect pins. */
const PERFECT_GUESS_RADIUS_KM = 0.025;

/**
 * The countries a scope draws its rounds from — the same set the sampler
 * uses, so the scale can never describe an area the game doesn't play.
 */
function codesForScope(scope: GameScope): string[] {
  if (scope.type === "country") {
    const country = getCountry(scope.code);
    return country ? [country.code] : [];
  }
  const countries: CountryCoverage[] =
    scope.type === "continent" ? getCountriesForContinent(scope.code) : COUNTRY_COVERAGE;
  return countries.map((c) => c.code);
}

/** Cached: every scope's scale is read relative to the whole globe's. */
let globeSpreadKm = 0;

/**
 * The distance at which a guess in this scope scores half of the maximum.
 *
 * Play-area size enters through `playAreaSpreadKm` — how far apart two
 * rounds in the scope typically fall — rather than through a bounding-box
 * diagonal, which counted ocean and let one distant island rewrite a whole
 * country's curve.
 */
export function mapHalfScoreKm(scope: GameScope): number {
  if (globeSpreadKm === 0) globeSpreadKm = playAreaSpreadKm(codesForScope({ type: "globe" }));
  const spread = playAreaSpreadKm(codesForScope(scope));
  if (spread === 0) return GLOBE_HALF_SCORE_KM; // unknown scope: grade it as the globe
  return GLOBE_HALF_SCORE_KM * Math.pow(spread / globeSpreadKm, SCALE_EXPONENT);
}

/** Exponential decay score, capped to [0, MAX_SCORE_PER_ROUND]. */
export function scoreFromDistance(distanceKm: number, halfScoreKm: number): number {
  if (distanceKm <= PERFECT_GUESS_RADIUS_KM) return MAX_SCORE_PER_ROUND;
  const raw = MAX_SCORE_PER_ROUND * Math.pow(2, -distanceKm / halfScoreKm);
  return Math.round(Math.max(0, Math.min(MAX_SCORE_PER_ROUND, raw)));
}
