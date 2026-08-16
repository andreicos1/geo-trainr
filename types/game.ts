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
  /**
   * The named region/city the pin falls in, when the image narrowed it that
   * far. Optional: the model returns nothing here when the image supports no
   * more than a country-level read, and older persisted games predate the
   * field. Carries the whole overview in country-locked games, where the
   * country itself is given and says nothing.
   */
  area?: string;
  lat: number;
  lng: number;
  confidence: number;
  reasoningSummary: string;
  pinpointReasoning: string;
}

export interface SelfCheckMistake {
  clueLabel: string;
  whatWasWrong: string;
  actually: string;
}

/**
 * The AI's self-critique from a second, follow-up call made after its
 * original blind guess — given the real location, does it think it got
 * anything important wrong? Optional because it's a best-effort add-on: if
 * this step fails, the round still has a perfectly usable guess/clue
 * breakdown from the first call.
 */
export interface SelfCheck {
  verdict: "correct" | "close" | "wrong";
  summary: string;
  mistakes: SelfCheckMistake[];
}

export interface RoundAnalysis {
  image: { dataUrl: string; width: number; height: number };
  clues: Clue[];
  aiGuess: AiGuess;
  selfCheck?: SelfCheck;
}

/** A location for one round, resolved from the random-location search. */
export interface RoundLocation {
  actual: LatLng;
  panoId: string;
  /**
   * The country this round was actually sampled from — known for certain at
   * sampling time (it's what `random-location.ts` picked before searching
   * for a panorama), so it's carried along rather than re-derived later by
   * reverse-geocoding `actual` against country bounding boxes, which is
   * unreliable near borders and for countries whose bboxes overlap.
   */
  country: string;
  /**
   * The heading/pitch/zoom the panorama opens at, chosen once per round.
   * Used both as the Street View panorama's initial view and as the
   * viewpoint captured for the AI's analysis, so the AI's image request can
   * fire as soon as the round starts instead of waiting on the player's
   * final camera position at guess time.
   */
  initialPov: { heading: number; pitch: number; zoom: number };
}

/** Everything known about a single completed round, before persistence shaping. */
export interface CompletedRound {
  roundIndex: number;
  actual: LatLng;
  guess: LatLng;
  distanceKm: number;
  score: number;
}

/**
 * The AI's analysis of a round, tracked independently of `CompletedRound`
 * since the request is kicked off as soon as the round's location is
 * ready — well before (often) the player has submitted their own guess.
 */
export type AiRoundResult =
  | { status: "pending" }
  | { status: "success"; analysis: RoundAnalysis; aiDistanceKm: number; aiScore: number }
  | { status: "error"; message: string };

export type GamePhase =
  | "loading-location"
  | "playing"
  | "submitting"
  | "feedback"
  | "summary"
  | "location-error";
