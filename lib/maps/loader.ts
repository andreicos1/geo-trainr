"use client";

import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let optionsSet = false;

function ensureOptions(): void {
  if (optionsSet) return;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Add it to .env.local.",
    );
  }
  setOptions({ key: apiKey, v: "weekly" });
  optionsSet = true;
}

const libraryCache = new Map<string, Promise<unknown>>();

/**
 * Loads a Google Maps JS library exactly once, no matter how many
 * components request it — `importLibrary()` itself dedupes per library
 * name, but callers still need `setOptions()` called first exactly once.
 */
function load<TName extends Parameters<typeof importLibrary>[0]>(
  name: TName,
): ReturnType<typeof importLibrary<TName>> {
  ensureOptions();
  if (!libraryCache.has(name)) {
    libraryCache.set(name, importLibrary(name));
  }
  return libraryCache.get(name) as ReturnType<typeof importLibrary<TName>>;
}

/** Loads the base `maps` library (Map, and the `google.maps.*` namespace). */
export async function loadGoogleMaps(): Promise<typeof google> {
  await load("maps");
  return google;
}

/** Ensures the `streetView` library (StreetViewService/Panorama) is loaded. */
export async function loadStreetView(): Promise<typeof google> {
  await load("streetView");
  return google;
}

/** Ensures the `marker` library is loaded, for the guess map. */
export async function loadMarkerLibrary(): Promise<typeof google> {
  await load("marker");
  return google;
}
