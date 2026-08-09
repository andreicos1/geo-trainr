import type { Continent, GameScope } from "@/types/game";

/**
 * A curated, hand-maintained approximation of "countries with meaningful
 * Google Street View coverage." There is no official API for this, so this
 * list only drives which countries render as selectable on the world map
 * and where the random-location sampler looks for panoramas.
 *
 * `code` is the country's ISO 3166-1 numeric code as a string, matching the
 * `id` field on features in world-atlas's countries-50m.json TopoJSON
 * (e.g. France = "250") — this lets the map component look up coverage
 * directly from a clicked feature's id with no separate mapping table.
 * The 50m (not 110m) resolution is required for micro-states like Monaco
 * or Singapore to exist as distinct clickable shapes at all; at 110m they
 * get absorbed into neighboring landmasses. Kosovo is a known exception:
 * Natural Earth's admin-0 data includes its shape but with no ISO code
 * (id is undefined), so it can't be added here without a separate id
 * lookup — not currently worth the complexity for one country.
 *
 * `bboxes` are rough [south, west, north, east] boxes over land/road
 * network areas with known coverage. They don't need to be precise: the
 * random-location sampler retries on a 50km panorama search radius, so
 * minor overlap with water or uncovered interior is tolerated.
 *
 * `extentBbox` is a separate, rough [south, west, north, east] box for the
 * country's *real* geographic extent, used only by the scoring formula's
 * map-diagonal calculation (see lib/geo/scoring.ts) — never for sampling.
 * It's omitted wherever the coverage clusters in `bboxes` already span
 * close to the whole country (small/compact countries), in which case
 * scoring falls back to the union of `bboxes`. It's required wherever
 * `bboxes` covers only a handful of cities within a country whose real
 * land area is much bigger (e.g. Brazil, Russia, India): scoring distance
 * against the narrow coverage clusters there would treat the country as
 * artificially small and punish long guesses far more harshly than
 * GeoGuessr does for the same country. Russia's box is clipped at the
 * antimeridian (east: 180) rather than correctly wrapping around it —
 * sacrificing the small Chukotka sliver past the dateline for simplicity.
 */
export interface CountryCoverage {
  code: string;
  name: string;
  continent: Continent;
  bboxes: [south: number, west: number, north: number, east: number][];
  extentBbox?: [south: number, west: number, north: number, east: number];
}

export const COUNTRY_COVERAGE: CountryCoverage[] = [
  // --- Europe ---
  { code: "250", name: "France", continent: "EU", bboxes: [[42.5, -4.5, 51, 8]] },
  { code: "276", name: "Germany", continent: "EU", bboxes: [[47.3, 5.9, 55, 15]] },
  { code: "826", name: "United Kingdom", continent: "EU", bboxes: [[50, -5.7, 58.7, 1.8]] },
  { code: "724", name: "Spain", continent: "EU", bboxes: [[36, -9.3, 43.8, 3.3]] },
  { code: "380", name: "Italy", continent: "EU", bboxes: [[37, 7, 46.5, 18.5]] },
  { code: "528", name: "Netherlands", continent: "EU", bboxes: [[50.7, 3.3, 53.5, 7.2]] },
  { code: "056", name: "Belgium", continent: "EU", bboxes: [[49.5, 2.5, 51.5, 6.4]] },
  { code: "756", name: "Switzerland", continent: "EU", bboxes: [[45.8, 5.9, 47.8, 10.5]] },
  { code: "040", name: "Austria", continent: "EU", bboxes: [[46.4, 9.5, 49, 17]] },
  { code: "752", name: "Sweden", continent: "EU", bboxes: [[55.3, 11, 68, 23]] },
  { code: "578", name: "Norway", continent: "EU", bboxes: [[58, 5, 68, 15]] },
  { code: "246", name: "Finland", continent: "EU", bboxes: [[60, 21, 68, 30]] },
  { code: "208", name: "Denmark", continent: "EU", bboxes: [[54.5, 8, 57.7, 12.7]] },
  { code: "616", name: "Poland", continent: "EU", bboxes: [[49, 14.2, 54.8, 24]] },
  { code: "620", name: "Portugal", continent: "EU", bboxes: [[37, -9.5, 42, -6.2]] },
  { code: "372", name: "Ireland", continent: "EU", bboxes: [[51.4, -10, 55.4, -6]] },
  { code: "203", name: "Czechia", continent: "EU", bboxes: [[48.6, 12.1, 51, 18.8]] },
  { code: "352", name: "Iceland", continent: "EU", bboxes: [[63.4, -23, 66.5, -13.5]] },
  { code: "300", name: "Greece", continent: "EU", bboxes: [[36, 20, 41.5, 26.5]] },
  { code: "348", name: "Hungary", continent: "EU", bboxes: [[45.8, 16, 48.6, 22.9]] },
  { code: "703", name: "Slovakia", continent: "EU", bboxes: [[47.7, 16.8, 49.6, 22.6]] },
  { code: "705", name: "Slovenia", continent: "EU", bboxes: [[45.4, 13.4, 46.9, 16.6]] },
  { code: "191", name: "Croatia", continent: "EU", bboxes: [[42.4, 13.5, 46.5, 19.4]] },
  { code: "233", name: "Estonia", continent: "EU", bboxes: [[57.5, 21.5, 59.7, 28.2]] },
  { code: "428", name: "Latvia", continent: "EU", bboxes: [[55.6, 20.9, 58.1, 28.2]] },
  { code: "440", name: "Lithuania", continent: "EU", bboxes: [[53.9, 20.9, 56.5, 26.9]] },
  { code: "442", name: "Luxembourg", continent: "EU", bboxes: [[49.4, 5.7, 50.2, 6.5]] },
  { code: "470", name: "Malta", continent: "EU", bboxes: [[35.8, 14.18, 36.08, 14.58]] },
  { code: "196", name: "Cyprus", continent: "EU", bboxes: [[34.5, 32.2, 35.7, 34.6]] },
  { code: "642", name: "Romania", continent: "EU", bboxes: [[43.6, 20.2, 48.3, 29.7]] },
  { code: "100", name: "Bulgaria", continent: "EU", bboxes: [[41.2, 22.3, 44.3, 28.6]] },
  { code: "688", name: "Serbia", continent: "EU", bboxes: [[42.2, 18.8, 46.2, 23]] },
  { code: "070", name: "Bosnia and Herzegovina", continent: "EU", bboxes: [[42.5, 15.7, 45.3, 19.7]] },
  { code: "807", name: "North Macedonia", continent: "EU", bboxes: [[40.8, 20.4, 42.4, 23.05]] },
  { code: "008", name: "Albania", continent: "EU", bboxes: [[39.6, 19.2, 42.7, 21.1]] },
  { code: "499", name: "Montenegro", continent: "EU", bboxes: [[41.85, 18.4, 43.6, 20.4]] },
  {
    code: "498",
    name: "Moldova",
    continent: "EU",
    bboxes: [[46.9, 28.75, 47.1, 28.95]], // Chisinau
    extentBbox: [45.4, 26.6, 48.5, 30.1],
  },
  {
    code: "804",
    name: "Ukraine",
    continent: "EU",
    bboxes: [
      [50.3, 30.3, 50.6, 30.7], // Kyiv
      [49.75, 23.9, 49.9, 24.1], // Lviv
      [46.35, 30.6, 46.55, 30.85], // Odesa
    ],
    extentBbox: [44.3, 22.1, 52.4, 40.2],
  },
  { code: "492", name: "Monaco", continent: "EU", bboxes: [[43.72, 7.4, 43.75, 7.44]] },
  { code: "020", name: "Andorra", continent: "EU", bboxes: [[42.43, 1.41, 42.66, 1.79]] },
  { code: "674", name: "San Marino", continent: "EU", bboxes: [[43.89, 12.4, 43.99, 12.52]] },

  // --- Asia ---
  { code: "392", name: "Japan", continent: "AS", bboxes: [[31, 130, 43.5, 141.5]] },
  { code: "410", name: "South Korea", continent: "AS", bboxes: [[34, 126, 38.6, 129.5]] },
  { code: "158", name: "Taiwan", continent: "AS", bboxes: [[22, 120, 25.3, 121.7]] },
  { code: "764", name: "Thailand", continent: "AS", bboxes: [[6.5, 98, 18.5, 102.5]] },
  {
    code: "360",
    name: "Indonesia",
    continent: "AS",
    bboxes: [
      [-8.7, 105, -5.9, 114.5], // Java + Bali
      [-6, 95, 5.5, 106], // Sumatra
    ],
    extentBbox: [-11, 95, 6.1, 141],
  },
  { code: "376", name: "Israel", continent: "AS", bboxes: [[29.5, 34.3, 33.3, 35.6]] },
  { code: "144", name: "Sri Lanka", continent: "AS", bboxes: [[6, 79.8, 9.8, 81.9]] },
  {
    code: "608",
    name: "Philippines",
    continent: "AS",
    bboxes: [[14, 120.5, 18, 122]], // Luzon
    extentBbox: [4.6, 116.9, 21.1, 126.6],
  },
  {
    code: "458",
    name: "Malaysia",
    continent: "AS",
    bboxes: [[1.3, 100, 6.5, 103.5]], // Peninsular
    extentBbox: [0.8, 99.6, 7.4, 119.3],
  },
  { code: "268", name: "Georgia", continent: "AS", bboxes: [[41, 41, 43.6, 46.7]] },
  { code: "792", name: "Turkey", continent: "AS", bboxes: [[36, 26, 42.1, 44.8]] },
  {
    code: "704",
    name: "Vietnam",
    continent: "AS",
    bboxes: [
      [20.9, 105.6, 21.15, 105.95], // Hanoi
      [10.65, 106.55, 10.9, 106.85], // Ho Chi Minh City
    ],
    extentBbox: [8.4, 102.1, 23.4, 109.5],
  },
  {
    code: "050",
    name: "Bangladesh",
    continent: "AS",
    bboxes: [[23.65, 90.3, 23.95, 90.5]], // Dhaka
    extentBbox: [20.6, 88, 26.6, 92.7],
  },
  {
    code: "398",
    name: "Kazakhstan",
    continent: "AS",
    bboxes: [
      [43.15, 76.8, 43.35, 77.1], // Almaty
      [51.05, 71.35, 51.25, 71.55], // Astana
    ],
    extentBbox: [40.6, 46.5, 55.4, 87.3],
  },
  {
    code: "496",
    name: "Mongolia",
    continent: "AS",
    bboxes: [[47.85, 106.75, 47.95, 106.95]], // Ulaanbaatar
    extentBbox: [41.6, 87.7, 52.1, 119.9],
  },
  { code: "064", name: "Bhutan", continent: "AS", bboxes: [[26.7, 88.7, 28.3, 92.1]] }, // Trekker coverage along the main highway
  {
    code: "417",
    name: "Kyrgyzstan",
    continent: "AS",
    bboxes: [[42.8, 74.5, 42.95, 74.7]], // Bishkek
    extentBbox: [39.2, 69.3, 43.3, 80.3],
  },
  {
    code: "524",
    name: "Nepal",
    continent: "AS",
    bboxes: [[27.6, 85.2, 27.8, 85.4]], // Kathmandu
    extentBbox: [26.3, 80, 30.4, 88.2],
  },
  { code: "512", name: "Oman", continent: "AS", bboxes: [[22, 56, 24.7, 59]] },
  { code: "344", name: "Hong Kong", continent: "AS", bboxes: [[22.15, 113.83, 22.56, 114.41]] },
  { code: "446", name: "Macao", continent: "AS", bboxes: [[22.1, 113.52, 22.22, 113.6]] },
  { code: "702", name: "Singapore", continent: "AS", bboxes: [[1.22, 103.6, 1.47, 104.05]] },
  {
    code: "643",
    name: "Russia",
    continent: "AS",
    bboxes: [
      [55.3, 36.8, 56.2, 38.3], // Moscow region
      [59.6, 29.6, 60.3, 30.7], // Saint Petersburg
      [55.6, 48.9, 55.9, 49.3], // Kazan
      [56.7, 60.4, 56.95, 60.75], // Yekaterinburg
      [54.9, 82.8, 55.15, 83.15], // Novosibirsk
      [43.4, 39.6, 43.7, 39.9], // Sochi
    ],
    extentBbox: [41.2, 19.6, 81.9, 180], // clipped at the antimeridian, see field doc
  },
  {
    code: "356",
    name: "India",
    continent: "AS",
    bboxes: [
      [28.4, 76.8, 28.9, 77.4], // Delhi NCR
      [18.85, 72.75, 19.3, 73.05], // Mumbai
      [12.85, 77.45, 13.15, 77.75], // Bengaluru
      [12.9, 80.1, 13.25, 80.35], // Chennai
      [17.25, 78.3, 17.55, 78.6], // Hyderabad
      [22.45, 88.25, 22.65, 88.45], // Kolkata
      [22.9, 72.4, 23.15, 72.7], // Ahmedabad
    ],
    extentBbox: [6.7, 68.1, 35.5, 97.4],
  },
  { code: "634", name: "Qatar", continent: "AS", bboxes: [[24.5, 50.7, 26.2, 51.7]] },
  { code: "784", name: "United Arab Emirates", continent: "AS", bboxes: [[22.6, 51.5, 26.1, 56.4]] },
  { code: "422", name: "Lebanon", continent: "AS", bboxes: [[33, 35.1, 34.7, 36.6]] },
  { code: "400", name: "Jordan", continent: "AS", bboxes: [[29.2, 34.9, 33.4, 39.3]] },
  { code: "414", name: "Kuwait", continent: "AS", bboxes: [[28.5, 46.5, 30.1, 48.5]] },
  { code: "048", name: "Bahrain", continent: "AS", bboxes: [[25.8, 50.4, 26.3, 50.8]] },

  // --- Africa ---
  {
    code: "710",
    name: "South Africa",
    continent: "AF",
    bboxes: [[-34.8, 17, -25.7, 32.9]],
    extentBbox: [-34.8, 16.5, -22.1, 32.9],
  },
  { code: "426", name: "Lesotho", continent: "AF", bboxes: [[-30.7, 27, -28.5, 29.5]] },
  { code: "748", name: "Eswatini", continent: "AF", bboxes: [[-27.3, 30.8, -25.7, 32.1]] },
  {
    code: "072",
    name: "Botswana",
    continent: "AF",
    bboxes: [[-25, 23, -19, 27.9]],
    extentBbox: [-26.9, 20, -17.8, 29.4],
  },
  {
    code: "404",
    name: "Kenya",
    continent: "AF",
    bboxes: [[-1.5, 36, 0.5, 38]], // Nairobi region roads
    extentBbox: [-4.7, 33.9, 5.5, 41.9],
  },
  {
    code: "686",
    name: "Senegal",
    continent: "AF",
    bboxes: [[13.5, -17.5, 15.7, -12.5]],
    extentBbox: [12.3, -17.5, 16.7, -11.3],
  },
  {
    code: "288",
    name: "Ghana",
    continent: "AF",
    bboxes: [[5, -2.5, 7.5, 0.5]],
    extentBbox: [4.7, -3.3, 11.2, 1.2],
  },
  {
    code: "566",
    name: "Nigeria",
    continent: "AF",
    bboxes: [[6, 3, 9.2, 8.5]], // Lagos/Abuja corridor
    extentBbox: [4.2, 2.7, 13.9, 14.7],
  },
  {
    code: "516",
    name: "Namibia",
    continent: "AF",
    bboxes: [
      [-22.65, 17, -22.4, 17.15], // Windhoek
      [-23, 14.4, -22.5, 15], // Swakopmund/Walvis Bay coastal corridor
    ],
    extentBbox: [-28.9, 11.7, -16.9, 25.3],
  },
  {
    code: "646",
    name: "Rwanda",
    continent: "AF",
    bboxes: [[-2.1, 29.9, -1.85, 30.2]], // Kigali
    extentBbox: [-2.85, 28.85, -1.05, 30.9],
  },
  {
    code: "800",
    name: "Uganda",
    continent: "AF",
    bboxes: [[0.2, 32.45, 0.45, 32.7]], // Kampala
    extentBbox: [-1.5, 29.6, 4.2, 35],
  },
  {
    code: "788",
    name: "Tunisia",
    continent: "AF",
    bboxes: [[33.5, 8, 37.5, 11.6]], // North-south highway corridor
    extentBbox: [30.2, 7.5, 37.5, 11.6],
  },

  // --- North America ---
  { code: "840", name: "United States", continent: "NA", bboxes: [[25, -124.7, 49, -67]] },
  {
    code: "124",
    name: "Canada",
    continent: "NA",
    bboxes: [[42, -123, 60, -53]],
    extentBbox: [41.7, -141, 83.1, -52.6],
  },
  {
    code: "484",
    name: "Mexico",
    continent: "NA",
    bboxes: [[16, -105, 26, -97]],
    extentBbox: [14.5, -117.1, 32.7, -86.7],
  },
  { code: "188", name: "Costa Rica", continent: "NA", bboxes: [[8.5, -85, 10.9, -82.6]] },
  { code: "591", name: "Panama", continent: "NA", bboxes: [[7.2, -83.05, 9.65, -77.15]] },
  { code: "320", name: "Guatemala", continent: "NA", bboxes: [[13.7, -92.3, 17.9, -88.2]] },
  { code: "222", name: "El Salvador", continent: "NA", bboxes: [[13.15, -90.15, 14.45, -87.7]] },
  { code: "340", name: "Honduras", continent: "NA", bboxes: [[12.9, -89.4, 16.5, -83.1]] },
  { code: "558", name: "Nicaragua", continent: "NA", bboxes: [[10.7, -87.7, 15, -83.1]] },
  { code: "084", name: "Belize", continent: "NA", bboxes: [[15.9, -89.2, 18.5, -87.5]] },
  { code: "214", name: "Dominican Republic", continent: "NA", bboxes: [[17.5, -72, 19.95, -68.3]] },

  // --- South America ---
  {
    code: "076",
    name: "Brazil",
    continent: "SA",
    bboxes: [
      [-25, -49, -20, -42], // Southeast (Sao Paulo/Rio)
      [-31, -57, -27, -49], // South
    ],
    extentBbox: [-33.7, -73.9, 5.3, -34.8],
  },
  {
    code: "032",
    name: "Argentina",
    continent: "SA",
    bboxes: [[-38, -68, -27, -57]],
    extentBbox: [-55.1, -73.6, -21.8, -53.6],
  },
  {
    code: "152",
    name: "Chile",
    continent: "SA",
    bboxes: [[-41, -73.5, -30, -70]],
    extentBbox: [-55.9, -75.6, -17.5, -66.4],
  },
  { code: "858", name: "Uruguay", continent: "SA", bboxes: [[-34.9, -58.4, -30.1, -53.1]] },
  {
    code: "170",
    name: "Colombia",
    continent: "SA",
    bboxes: [[3.5, -76.5, 7, -73.5]], // Bogota/Medellin corridor
    extentBbox: [-4.2, -79, 12.5, -66.9],
  },
  {
    code: "604",
    name: "Peru",
    continent: "SA",
    bboxes: [[-13, -77.5, -11, -76]], // Lima region
    extentBbox: [-18.3, -81.3, -0.03, -68.7],
  },
  { code: "218", name: "Ecuador", continent: "SA", bboxes: [[-5, -81.1, 1.5, -75.2]] },
  { code: "600", name: "Paraguay", continent: "SA", bboxes: [[-27.6, -62.7, -19.3, -54.3]] },
  {
    code: "068",
    name: "Bolivia",
    continent: "SA",
    bboxes: [[-16.65, -68.25, -16.35, -68]], // La Paz region
    extentBbox: [-22.9, -69.6, -9.7, -57.5],
  },

  // --- Oceania ---
  {
    code: "036",
    name: "Australia",
    continent: "OC",
    bboxes: [
      [-38.5, 144, -33, 151.5], // Southeast (Melbourne-Sydney)
      [-35, 138, -31.5, 141], // Adelaide region
      [-32.5, 115, -31.5, 116.2], // Perth region
    ],
    extentBbox: [-43.6, 113.2, -10.7, 153.6],
  },
  { code: "554", name: "New Zealand", continent: "OC", bboxes: [[-46.7, 166.5, -34.4, 178.6]] },
];

export function getCountry(code: string): CountryCoverage | undefined {
  return COUNTRY_COVERAGE.find((c) => c.code === code);
}

export function getCountriesForContinent(continent: Continent): CountryCoverage[] {
  return COUNTRY_COVERAGE.filter((c) => c.continent === continent);
}

export const CONTINENTS: { code: Continent; label: string }[] = [
  { code: "EU", label: "Europe" },
  { code: "AS", label: "Asia" },
  { code: "AF", label: "Africa" },
  { code: "NA", label: "North America" },
  { code: "SA", label: "South America" },
  { code: "OC", label: "Oceania" },
];

const coverageByCode = new Map(COUNTRY_COVERAGE.map((c) => [c.code, c]));

export function hasCoverage(code: string): boolean {
  return coverageByCode.has(code);
}

/**
 * Finds which covered country's sampling boxes a point falls inside, used
 * to tell the AI's post-mortem step the real answer's country name without
 * a separate reverse-geocoding call. Checks `bboxes` first (where a round's
 * point always lands, since that's what `random-location.ts` samples from
 * and Street View snaps to nearby imagery), then falls back to
 * `extentBbox` for the rare snap that lands just outside a coverage
 * cluster but still within the country's real borders.
 */
export function findCountryByPoint(lat: number, lng: number): CountryCoverage | undefined {
  const inBox = ([south, west, north, east]: [number, number, number, number]) =>
    lat >= south && lat <= north && lng >= west && lng <= east;

  return (
    COUNTRY_COVERAGE.find((c) => c.bboxes.some(inBox)) ??
    COUNTRY_COVERAGE.find((c) => c.extentBbox && inBox(c.extentBbox))
  );
}

export function describeScope(scope: GameScope): string {
  if (scope.type === "globe") return "Whole World";
  if (scope.type === "continent") {
    return CONTINENTS.find((c) => c.code === scope.code)?.label ?? scope.code;
  }
  return getCountry(scope.code)?.name ?? scope.code;
}
