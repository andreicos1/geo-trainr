import { z } from "zod";
import type { GameScope, LatLng } from "./game";

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

const gameScopeSchema = z.union([
  z.object({ type: z.literal("country"), code: z.string() }),
  z.object({
    type: z.literal("continent"),
    code: z.enum(["EU", "AS", "AF", "NA", "SA", "OC"]),
  }),
  z.object({ type: z.literal("globe") }),
]);

export const roundRecordSchema = z.object({
  roundIndex: z.number(),
  actual: latLngSchema,
  guess: latLngSchema,
  aiGuess: z
    .object({
      lat: z.number(),
      lng: z.number(),
      country: z.string(),
      confidence: z.number(),
    })
    .nullable(),
  distanceKm: z.number(),
  aiDistanceKm: z.number().nullable(),
  score: z.number(),
  aiScore: z.number().nullable(),
  maxScore: z.number(),
});

export const gameRecordSchema = z.object({
  id: z.string(),
  playedAt: z.string(),
  scope: gameScopeSchema,
  rounds: z.array(roundRecordSchema),
  totalScore: z.number(),
  totalAiScore: z.number(),
  totalMaxScore: z.number(),
});

export const gameSettingsSchema = z.object({
  lastScope: gameScopeSchema.optional(),
});

export const historyEnvelopeSchema = z.object({
  version: z.literal(1),
  games: z.array(gameRecordSchema),
});

export const settingsEnvelopeSchema = z.object({
  version: z.literal(1),
  settings: gameSettingsSchema,
});

export type RoundRecord = z.infer<typeof roundRecordSchema>;
export type GameRecord = z.infer<typeof gameRecordSchema>;
export type GameSettings = z.infer<typeof gameSettingsSchema>;

export interface AggregateStats {
  gamesPlayed: number;
  avgScore: number;
  avgAiScore: number;
  bestScore: number;
}

// Re-exported so callers of the storage module don't need to import from
// two different files for closely related types.
export type { GameScope, LatLng };
