import { z } from "zod";

export const ClueSchema = z.object({
  label: z.string().describe("A short (2-6 word) title for this clue, e.g. 'Bollard style'."),
  explanation: z
    .string()
    .describe(
      "One or two sentences explaining what this visual detail is and why it points to a particular place.",
    ),
  boundingBox: z
    .object({
      x: z.number().describe("Left edge, normalized 0-1 fraction of image width."),
      y: z.number().describe("Top edge, normalized 0-1 fraction of image height."),
      width: z.number().describe("Box width, normalized 0-1 fraction of image width."),
      height: z.number().describe("Box height, normalized 0-1 fraction of image height."),
    })
    .describe(
      "Tight bounding box around the visual detail in the image, with all four values in the 0-1 range.",
    ),
  // Strict structured-output mode (used by zodFunction) requires every
  // field to be present — optionality is expressed via .nullable(), not
  // .optional(). Pass null when there's nothing more specific to name.
  suggests: z
    .string()
    .nullable()
    .describe("Short label for what this clue suggests, e.g. a country or region name, or null."),
});

export const RoundAnalysisSchema = z.object({
  clues: z
    .array(ClueSchema)
    .describe("3 to 8 distinct visual clues identified in the image, ranked most-useful first."),
  guess: z.object({
    country: z.string().describe("Your best-guess country name."),
    lat: z.number().describe("Your best-guess latitude, decimal degrees."),
    lng: z.number().describe("Your best-guess longitude, decimal degrees."),
    confidence: z
      .number()
      .describe("Your confidence in this guess, from 0 (pure guess) to 1 (certain)."),
    reasoningSummary: z
      .string()
      .describe("A 1-3 sentence summary of how the clues combine into this guess."),
  }),
});

export type RoundAnalysisParsed = z.infer<typeof RoundAnalysisSchema>;
