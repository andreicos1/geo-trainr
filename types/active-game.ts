import { z } from "zod";
import { gameScopeSchema } from "./history";

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

const roundLocationSchema = z.object({
  actual: latLngSchema,
  // Optional: older persisted snapshots (pre-country-tracking) won't have this field.
  country: z.string().optional(),
  panoId: z.string(),
  initialPov: z.object({ heading: z.number(), pitch: z.number(), zoom: z.number() }),
});

const completedRoundSchema = z.object({
  roundIndex: z.number(),
  actual: latLngSchema,
  guess: latLngSchema,
  distanceKm: z.number(),
  score: z.number(),
});

const clueSchema = z.object({
  label: z.string(),
  explanation: z.string(),
  boundingBox: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
  suggests: z.string().optional(),
});

const aiGuessSchema = z.object({
  country: z.string(),
  lat: z.number(),
  lng: z.number(),
  confidence: z.number(),
  reasoningSummary: z.string(),
  // Optional: older persisted snapshots (pre-pinpointReasoning) won't have this field.
  pinpointReasoning: z.string().optional(),
  // Optional for the same reason, and also genuinely absent whenever the
  // image didn't narrow the location past the country.
  area: z.string().optional(),
});

const roundAnalysisSchema = z.object({
  image: z.object({ dataUrl: z.string(), width: z.number(), height: z.number() }),
  clues: z.array(clueSchema),
  aiGuess: aiGuessSchema,
});

const aiRoundResultSchema = z.union([
  z.object({ status: z.literal("pending") }),
  z.object({
    status: z.literal("success"),
    analysis: roundAnalysisSchema,
    aiDistanceKm: z.number(),
    aiScore: z.number(),
  }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

/**
 * Snapshot of an in-progress `GameSession` reducer state, persisted to
 * localStorage so a game survives the X button, a tab close, or a refresh —
 * only phases a resume can meaningfully land on are representable here;
 * "submitting" and "summary" never get persisted (see lib/storage/active-game.ts).
 */
export const activeGameSchema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  scope: gameScopeSchema,
  phase: z.enum(["loading-location", "playing", "feedback", "location-error"]),
  roundIndex: z.number(),
  currentLocation: roundLocationSchema.nullable(),
  rounds: z.array(completedRoundSchema),
  aiResults: z.record(z.string(), aiRoundResultSchema),
  locationError: z.string().nullable(),
});

export type ActiveGameState = z.infer<typeof activeGameSchema>;
