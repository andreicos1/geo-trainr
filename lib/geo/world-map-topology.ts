import worldTopoJson from "world-atlas/countries-50m.json";

/**
 * Natural Earth's admin-0 country boundaries (world-atlas's source data)
 * file the Crimean peninsula as part of Russia's shape, reflecting de
 * facto control rather than the internationally recognized border. Crimea
 * is stored as one fully self-contained ring within Russia's MultiPolygon
 * — not fused to the mainland — so it can be reassigned to Ukraine by
 * moving that one ring across features, no polygon clipping needed.
 *
 * Verified against world-atlas@2.0.2's countries-50m.json: Russia's 99th
 * (last) polygon has bounds ~[32.5-36.6°E, 44.4-46.2°N], matching Crimea.
 * If a future version of the data reorders or changes this, the guard
 * below makes the patch a no-op rather than silently moving the wrong
 * shape.
 */
export interface CountryGeometry {
  id?: string;
  type: string;
  /** Arc indices: `number[][]` for a Polygon, `number[][][]` for a MultiPolygon. */
  arcs: unknown[];
}

export interface CountriesTopology {
  objects: { countries: { geometries: CountryGeometry[] } };
  /** Quantized, delta-encoded arcs, shared between geometries. */
  arcs: number[][][];
  transform: { scale: [number, number]; translate: [number, number] };
}

const RUSSIA_ID = "643";
const UKRAINE_ID = "804";
const EXPECTED_RUSSIA_POLYGON_COUNT = 99;
const CRIMEA_POLYGON_INDEX = 98;

function patchCrimeaIntoUkraine(topology: CountriesTopology) {
  const geometries = topology.objects.countries.geometries;
  const russia = geometries.find((g) => g.id === RUSSIA_ID);
  const ukraine = geometries.find((g) => g.id === UKRAINE_ID);
  if (
    !russia ||
    !ukraine ||
    russia.type !== "MultiPolygon" ||
    ukraine.type !== "MultiPolygon" ||
    russia.arcs.length !== EXPECTED_RUSSIA_POLYGON_COUNT
  ) {
    return; // Data shape changed since this was verified — skip rather than guess.
  }
  const [crimea] = russia.arcs.splice(CRIMEA_POLYGON_INDEX, 1);
  ukraine.arcs.push(crimea);
}

const patched = structuredClone(worldTopoJson) as unknown as CountriesTopology;
patchCrimeaIntoUkraine(patched);

/** The world-atlas countries topology, with Crimea reassigned to Ukraine. */
export const WORLD_TOPOJSON = patched;
