"use client";

import { loadStreetView } from "@/lib/maps/loader";
import {
  COUNTRY_COVERAGE,
  getCountriesForContinent,
  getCountry,
  type CountryCoverage,
} from "./countries-coverage";
import type { GameScope, RoundLocation } from "@/types/game";

const SEARCH_RADIUS_METERS = 50_000;
const ATTEMPTS_PER_COUNTRY = 15;
const MAX_COUNTRY_FALLBACKS = 8;

export class NoLocationFoundError extends Error {
  constructor() {
    super(
      "Couldn't find a Street View location for this selection. Please try again.",
    );
    this.name = "NoLocationFoundError";
  }
}

function candidateCountries(scope: GameScope): CountryCoverage[] {
  if (scope.type === "country") {
    const country = getCountry(scope.code);
    return country ? [country] : [];
  }
  if (scope.type === "continent") {
    return getCountriesForContinent(scope.code);
  }
  return COUNTRY_COVERAGE;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

type Bbox = [south: number, west: number, north: number, east: number];

function bboxArea([south, west, north, east]: Bbox): number {
  return Math.max(0, north - south) * Math.max(0, east - west);
}

/** Picks one bbox from a country's list, weighted by area. */
function pickWeightedBbox(bboxes: Bbox[]): Bbox {
  const weights = bboxes.map(bboxArea);
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return pickRandom(bboxes);
  let r = Math.random() * total;
  for (let i = 0; i < bboxes.length; i++) {
    r -= weights[i];
    if (r <= 0) return bboxes[i];
  }
  return bboxes[bboxes.length - 1];
}

function randomPointInBbox([south, west, north, east]: Bbox): google.maps.LatLngLiteral {
  return {
    lat: south + Math.random() * (north - south),
    lng: west + Math.random() * (east - west),
  };
}

async function tryOneCountry(
  streetViewService: google.maps.StreetViewService,
  country: CountryCoverage,
): Promise<RoundLocation | null> {
  for (let attempt = 0; attempt < ATTEMPTS_PER_COUNTRY; attempt++) {
    const bbox = pickWeightedBbox(country.bboxes);
    const point = randomPointInBbox(bbox);
    try {
      const response = await streetViewService.getPanorama({
        location: point,
        radius: SEARCH_RADIUS_METERS,
        sources: [google.maps.StreetViewSource.OUTDOOR],
      });
      const location = response.data.location;
      if (location?.latLng && location.pano) {
        return {
          actual: { lat: location.latLng.lat(), lng: location.latLng.lng() },
          panoId: location.pano,
          initialPov: { heading: Math.random() * 360, pitch: 0, zoom: 0 },
        };
      }
    } catch {
      // ZERO_RESULTS or transient error — try another point.
    }
  }
  return null;
}

/**
 * Finds a random panorama with Street View coverage inside the given
 * scope. Resolves to the panorama's *actual* returned location (which
 * Street View snaps to the nearest available imagery), never the sampled
 * candidate point.
 */
export async function findRandomLocation(
  scope: GameScope,
): Promise<RoundLocation> {
  await loadStreetView();
  const streetViewService = new google.maps.StreetViewService();

  const countries = candidateCountries(scope);
  if (countries.length === 0) {
    throw new NoLocationFoundError();
  }

  const fallbackAttempts =
    scope.type === "country" ? 1 : Math.min(MAX_COUNTRY_FALLBACKS, countries.length);

  const shuffled = [...countries].sort(() => Math.random() - 0.5);
  const tried = scope.type === "country" ? countries : shuffled.slice(0, fallbackAttempts);

  for (const country of tried) {
    const result = await tryOneCountry(streetViewService, country);
    if (result) return result;
  }

  throw new NoLocationFoundError();
}
