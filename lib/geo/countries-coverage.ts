import type { Continent, GameScope } from "@/types/game";
import { countryCodeAt } from "./country-shapes";

/**
 * A curated, hand-maintained approximation of "countries with meaningful
 * Google Street View coverage." There is no official API for this, so this
 * list only decides which countries are selectable and which continent each
 * belongs to. Geometry lives in `country-shapes.ts`, derived from the same
 * Natural Earth topology the picker renders.
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
 * This used to carry hand-drawn `bboxes` and `extentBbox` rectangles per
 * country, which the sampler drew from and also used to check that a
 * panorama hadn't snapped across a border. That forced every box to stay
 * strictly inside real borders, which in turn meant large countries could
 * only be represented as a handful of city clusters — India as seven metro
 * boxes, Brazil as two. Rounds clustered there, and scoring needed
 * `extentBbox` as an escape hatch to undo the distortion. Real polygons do
 * both jobs exactly, so the rectangles are gone.
 */
export interface CountryCoverage {
  code: string;
  name: string;
  continent: Continent;
}

export const COUNTRY_COVERAGE: CountryCoverage[] = [
  // --- Europe ---
  { code: "250", name: "France", continent: "EU" },
  { code: "276", name: "Germany", continent: "EU" },
  { code: "826", name: "United Kingdom", continent: "EU" },
  { code: "724", name: "Spain", continent: "EU" },
  { code: "380", name: "Italy", continent: "EU" },
  { code: "528", name: "Netherlands", continent: "EU" },
  { code: "056", name: "Belgium", continent: "EU" },
  { code: "756", name: "Switzerland", continent: "EU" },
  { code: "040", name: "Austria", continent: "EU" },
  { code: "752", name: "Sweden", continent: "EU" },
  { code: "578", name: "Norway", continent: "EU" },
  { code: "246", name: "Finland", continent: "EU" },
  { code: "208", name: "Denmark", continent: "EU" },
  { code: "616", name: "Poland", continent: "EU" },
  { code: "620", name: "Portugal", continent: "EU" },
  { code: "372", name: "Ireland", continent: "EU" },
  { code: "203", name: "Czechia", continent: "EU" },
  { code: "352", name: "Iceland", continent: "EU" },
  { code: "300", name: "Greece", continent: "EU" },
  { code: "348", name: "Hungary", continent: "EU" },
  { code: "703", name: "Slovakia", continent: "EU" },
  { code: "705", name: "Slovenia", continent: "EU" },
  { code: "191", name: "Croatia", continent: "EU" },
  { code: "233", name: "Estonia", continent: "EU" },
  { code: "428", name: "Latvia", continent: "EU" },
  { code: "440", name: "Lithuania", continent: "EU" },
  { code: "442", name: "Luxembourg", continent: "EU" },
  { code: "470", name: "Malta", continent: "EU" },
  { code: "196", name: "Cyprus", continent: "EU" },
  { code: "642", name: "Romania", continent: "EU" },
  { code: "100", name: "Bulgaria", continent: "EU" },
  { code: "688", name: "Serbia", continent: "EU" },
  { code: "070", name: "Bosnia and Herzegovina", continent: "EU" },
  { code: "807", name: "North Macedonia", continent: "EU" },
  { code: "008", name: "Albania", continent: "EU" },
  { code: "499", name: "Montenegro", continent: "EU" },
  { code: "498", name: "Moldova", continent: "EU" },
  { code: "804", name: "Ukraine", continent: "EU" },
  { code: "492", name: "Monaco", continent: "EU" },
  { code: "020", name: "Andorra", continent: "EU" },
  { code: "674", name: "San Marino", continent: "EU" },
  // --- Asia ---
  { code: "392", name: "Japan", continent: "AS" },
  { code: "410", name: "South Korea", continent: "AS" },
  { code: "158", name: "Taiwan", continent: "AS" },
  { code: "764", name: "Thailand", continent: "AS" },
  { code: "360", name: "Indonesia", continent: "AS" },
  { code: "376", name: "Israel", continent: "AS" },
  { code: "144", name: "Sri Lanka", continent: "AS" },
  { code: "608", name: "Philippines", continent: "AS" },
  { code: "458", name: "Malaysia", continent: "AS" },
  { code: "268", name: "Georgia", continent: "AS" },
  { code: "792", name: "Turkey", continent: "AS" },
  { code: "704", name: "Vietnam", continent: "AS" },
  { code: "050", name: "Bangladesh", continent: "AS" },
  { code: "398", name: "Kazakhstan", continent: "AS" },
  { code: "496", name: "Mongolia", continent: "AS" },
  { code: "064", name: "Bhutan", continent: "AS" },
  { code: "417", name: "Kyrgyzstan", continent: "AS" },
  { code: "524", name: "Nepal", continent: "AS" },
  { code: "512", name: "Oman", continent: "AS" },
  { code: "344", name: "Hong Kong", continent: "AS" },
  { code: "446", name: "Macao", continent: "AS" },
  { code: "702", name: "Singapore", continent: "AS" },
  { code: "643", name: "Russia", continent: "AS" },
  { code: "356", name: "India", continent: "AS" },
  { code: "634", name: "Qatar", continent: "AS" },
  { code: "784", name: "United Arab Emirates", continent: "AS" },
  { code: "422", name: "Lebanon", continent: "AS" },
  { code: "400", name: "Jordan", continent: "AS" },
  { code: "414", name: "Kuwait", continent: "AS" },
  { code: "048", name: "Bahrain", continent: "AS" },
  // --- Africa ---
  { code: "710", name: "South Africa", continent: "AF" },
  { code: "426", name: "Lesotho", continent: "AF" },
  { code: "748", name: "Eswatini", continent: "AF" },
  { code: "072", name: "Botswana", continent: "AF" },
  { code: "404", name: "Kenya", continent: "AF" },
  { code: "686", name: "Senegal", continent: "AF" },
  { code: "288", name: "Ghana", continent: "AF" },
  { code: "566", name: "Nigeria", continent: "AF" },
  { code: "516", name: "Namibia", continent: "AF" },
  { code: "646", name: "Rwanda", continent: "AF" },
  { code: "800", name: "Uganda", continent: "AF" },
  { code: "788", name: "Tunisia", continent: "AF" },
  // --- North America ---
  { code: "840", name: "United States", continent: "NA" },
  { code: "124", name: "Canada", continent: "NA" },
  { code: "484", name: "Mexico", continent: "NA" },
  { code: "188", name: "Costa Rica", continent: "NA" },
  { code: "591", name: "Panama", continent: "NA" },
  { code: "320", name: "Guatemala", continent: "NA" },
  { code: "222", name: "El Salvador", continent: "NA" },
  { code: "340", name: "Honduras", continent: "NA" },
  { code: "558", name: "Nicaragua", continent: "NA" },
  { code: "084", name: "Belize", continent: "NA" },
  { code: "214", name: "Dominican Republic", continent: "NA" },
  // --- South America ---
  { code: "076", name: "Brazil", continent: "SA" },
  { code: "032", name: "Argentina", continent: "SA" },
  { code: "152", name: "Chile", continent: "SA" },
  { code: "858", name: "Uruguay", continent: "SA" },
  { code: "170", name: "Colombia", continent: "SA" },
  { code: "604", name: "Peru", continent: "SA" },
  { code: "218", name: "Ecuador", continent: "SA" },
  { code: "600", name: "Paraguay", continent: "SA" },
  { code: "068", name: "Bolivia", continent: "SA" },
  // --- Oceania ---
  { code: "036", name: "Australia", continent: "OC" },
  { code: "554", name: "New Zealand", continent: "OC" },
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
 * Which covered country a point falls in, used to tell the AI's self-check
 * step the real answer's country without a reverse-geocoding call. Exact:
 * it's a point-in-polygon test against real borders, not the bounding-box
 * approximation this used to be.
 */
export function findCountryByPoint(lat: number, lng: number): CountryCoverage | undefined {
  const code = countryCodeAt(lat, lng);
  return code ? getCountry(code) : undefined;
}

export function describeScope(scope: GameScope): string {
  if (scope.type === "globe") return "Whole World";
  if (scope.type === "continent") {
    return CONTINENTS.find((c) => c.code === scope.code)?.label ?? scope.code;
  }
  return getCountry(scope.code)?.name ?? scope.code;
}
