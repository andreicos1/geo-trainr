export type Continent = "EU" | "AS" | "AF" | "NA" | "SA" | "OC";

export interface LatLng {
  lat: number;
  lng: number;
}

export type GameScope =
  | { type: "country"; code: string }
  | { type: "continent"; code: Continent }
  | { type: "globe" };

export const ROUNDS_PER_GAME = 5;
export const MAX_SCORE_PER_ROUND = 5000;
export const MAX_SCORE_PER_GAME = MAX_SCORE_PER_ROUND * ROUNDS_PER_GAME;

export interface Clue {
  label: string;
  explanation: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  suggests?: string;
}

export interface AiGuess {
  country: string;
  lat: number;
  lng: number;
  confidence: number;
  reasoningSummary: string;
}

export interface RoundAnalysis {
  image: { dataUrl: string; width: number; height: number };
  clues: Clue[];
  aiGuess: AiGuess;
}

/** A location for one round, resolved from the random-location search. */
export interface RoundLocation {
  actual: LatLng;
  panoId: string;
}

/** Everything known about a single completed round, before persistence shaping. */
export interface CompletedRound {
  roundIndex: number;
  actual: LatLng;
  guess: LatLng;
  heading: number;
  pitch: number;
  zoom: number;
  distanceKm: number;
  score: number;
  analysis: RoundAnalysis | null; // null if the AI call failed
  aiDistanceKm: number | null;
  aiScore: number | null;
}

export type GamePhase =
  | "loading-location"
  | "playing"
  | "submitting"
  | "feedback"
  | "summary"
  | "location-error";
