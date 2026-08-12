"use client";

import { loadStreetView } from "@/lib/maps/loader";
import {
  COUNTRY_COVERAGE,
  getCountriesForContinent,
  getCountry,
  hasCoverage,
} from "./countries-coverage";
import {
  areaContains,
  countryCodeAt,
  randomPointByArea,
  samplingAreasFor,
  type Bbox,
  type SamplingArea,
} from "./country-shapes";
import type { GameScope, LatLng, RoundLocation } from "@/types/game";

/**
 * Picks a round's panorama by choosing a random *area* inside the play area
 * first, and only then looking for imagery in it. The country a round lands
 * in is a consequence of geography, never of list order.
 *
 * The previous approach — shuffle the country list, take the first country
 * that yields a panorama — made every country equally likely, so Monaco came
 * up as often as Russia and Europe's 41 entries took ~39% of all globe
 * rounds. Deriving the country from the point instead makes country
 * frequency proportional to land area, and the radius ladder below then
 * weights that by how much imagery is actually there.
 */

/**
 * Radius for each successive wave of panorama lookups.
 *
 * The old sampler used a flat 50km, which quietly wrecked the distribution:
 * anywhere a single road existed within 50km the lookup succeeded, so one
 * lone outback highway captured a 7,850km² catchment while a dense city
 * network captured the same 1.0. Per kilometre of real road, empty regions
 * were massively over-represented — the "anonymous rural highway" problem.
 *
 * Starting tight makes success probability track local imagery density, so
 * the draw lands where there is actually something to look at. Widening
 * only after a whole wave misses keeps genuinely sparse scopes (Russia,
 * Canada, Australia) playable instead of failing them outright.
 */
const SEARCH_WAVES_METERS = [2_000, 2_000, 10_000, 10_000, 50_000, 50_000];

/**
 * Candidates probed concurrently per wave. Sampling is free and network
 * latency dominates, so a batch costs about the same wall-clock time as a
 * single lookup while making a wave far more likely to land a hit.
 */
const CANDIDATES_PER_WAVE = 8;

/** Ceiling on the local rejection loop, so a pathological scope can't spin. */
const MAX_SAMPLE_ATTEMPTS = 2_000;

export class NoLocationFoundError extends Error {
  constructor() {
    super(
      "Couldn't find a Street View location for this selection. Please try again.",
    );
    this.name = "NoLocationFoundError";
  }
}

const DEGREES = Math.PI / 180;

/** Area of a lat/lng box on the sphere, in Earth-radius² units. */
function bboxArea([south, west, north, east]: Bbox): number {
  return (Math.sin(north * DEGREES) - Math.sin(south * DEGREES)) * (east - west) * DEGREES;
}

interface WeightedAreas {
  areas: SamplingArea[];
  /** Running area totals, so a landmass can be drawn by binary search. */
  cumulative: number[];
  total: number;
}

const areasByScope = new Map<string, WeightedAreas | null>();

function scopeKey(scope: GameScope): string {
  return scope.type === "globe" ? "globe" : `${scope.type}:${scope.code}`;
}

function codesInScope(scope: GameScope): string[] {
  if (scope.type === "country") return hasCoverage(scope.code) ? [scope.code] : [];
  if (scope.type === "continent") {
    return getCountriesForContinent(scope.code).map((country) => country.code);
  }
  return COUNTRY_COVERAGE.map((country) => country.code);
}

/** A scope's landmasses and their area weights, built once per scope. */
function weightedAreas(scope: GameScope): WeightedAreas | null {
  const key = scopeKey(scope);
  const cached = areasByScope.get(key);
  if (cached !== undefined) return cached;

  const areas = samplingAreasFor(codesInScope(scope));
  let total = 0;
  const cumulative = areas.map((area) => (total += bboxArea(area.bbox)));
  const weighted = areas.length > 0 && total > 0 ? { areas, cumulative, total } : null;

  areasByScope.set(key, weighted);
  return weighted;
}

/** Draws one landmass with probability proportional to its bounding box. */
function pickArea({ areas, cumulative, total }: WeightedAreas): SamplingArea {
  const target = Math.random() * total;
  let low = 0;
  let high = cumulative.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulative[mid] < target) low = mid + 1;
    else high = mid;
  }
  return areas[low];
}

interface Candidate {
  point: LatLng;
  code: string;
}

/**
 * Stage 1 — a random point genuinely on land inside the scope.
 *
 * Entirely local, so ocean is discarded for free rather than by spending a
 * Street View request to discover there's nothing there. The point must
 * land on the same landmass whose box drew it; see `areaContains` for why
 * that, rather than a general country lookup, is what keeps the draw
 * proportional to real land area.
 */
function sampleCandidate(areas: WeightedAreas): Candidate | null {
  for (let attempt = 0; attempt < MAX_SAMPLE_ATTEMPTS; attempt++) {
    const area = pickArea(areas);
    const point = randomPointByArea(area.bbox);
    if (areaContains(area, point.lat, point.lng)) return { point, code: area.code };
  }
  return null;
}

/** Stages 2 and 3 — find imagery near a candidate, then confirm it didn't drift. */
async function probe(
  streetViewService: google.maps.StreetViewService,
  candidate: Candidate,
  radius: number,
): Promise<RoundLocation | null> {
  try {
    const response = await streetViewService.getPanorama({
      location: candidate.point,
      radius,
      sources: [google.maps.StreetViewSource.OUTDOOR],
    });
    const location = response.data.location;
    if (!location?.latLng || !location.pano) return null;

    const snapped = { lat: location.latLng.lat(), lng: location.latLng.lng() };
    // Street View snaps to the nearest imagery, which near a border can be
    // in the neighbouring country. Real polygons settle that exactly, so a
    // round can never be labelled with a country it isn't in.
    if (countryCodeAt(snapped.lat, snapped.lng) !== candidate.code) return null;

    return {
      actual: snapped,
      country: getCountry(candidate.code)?.name ?? candidate.code,
      panoId: location.pano,
      initialPov: { heading: Math.random() * 360, pitch: 0, zoom: 0 },
    };
  } catch {
    // ZERO_RESULTS or a transient error — this candidate just doesn't pan out.
    return null;
  }
}

/**
 * Finds a random panorama within the given scope. Resolves to the
 * panorama's *actual* location — where Street View snapped to — never the
 * sampled candidate point.
 */
export async function findRandomLocation(scope: GameScope): Promise<RoundLocation> {
  await loadStreetView();
  const streetViewService = new google.maps.StreetViewService();

  const areas = weightedAreas(scope);
  if (!areas) throw new NoLocationFoundError();

  for (const radius of SEARCH_WAVES_METERS) {
    const candidates: Candidate[] = [];
    for (let i = 0; i < CANDIDATES_PER_WAVE; i++) {
      const candidate = sampleCandidate(areas);
      if (candidate) candidates.push(candidate);
    }
    if (candidates.length === 0) break;

    const results = await Promise.all(
      candidates.map((candidate) => probe(streetViewService, candidate, radius)),
    );
    const hits = results.filter((hit): hit is RoundLocation => hit !== null);

    // Take a random hit, not the first to resolve: `Promise.any` would bias
    // the draw towards whichever request happened to come back fastest.
    if (hits.length > 0) return hits[Math.floor(Math.random() * hits.length)];
  }

  throw new NoLocationFoundError();
}
