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
    area: z
      .string()
      .nullable()
      .describe(
        "The specific sub-country area your pin sits in — a named city, region, province, state, or " +
          "similar — or null if nothing in the image narrows the location beyond the country. Never " +
          "name a place you can't justify from something visible in the image.",
      ),
    lat: z.number().describe("Your best-guess latitude, decimal degrees."),
    lng: z.number().describe("Your best-guess longitude, decimal degrees."),
    confidence: z
      .number()
      .describe("Your confidence in this guess, from 0 (pure guess) to 1 (certain)."),
    reasoningSummary: z
      .string()
      .describe(
        "A 1-3 sentence summary of how the clues combine into this country/region-level guess.",
      ),
    pinpointReasoning: z
      .string()
      .describe(
        "1-2 sentences explaining specifically why the pin landed at this exact lat/lng, not just the country. " +
          "Name whatever narrowed it beyond the country: a specific city/region identified from signage or " +
          "architecture, terrain or vegetation matching a particular part of the country, road infrastructure " +
          "density suggesting urban vs. rural, etc. If nothing in the image narrows it down further than 'somewhere " +
          "in this country', say so plainly instead of defaulting to the capital or largest city without evidence.",
      ),
  }),
});

export type RoundAnalysisParsed = z.infer<typeof RoundAnalysisSchema>;

// Note: no "verdict" field here — whether the guess counts as correct/close/wrong
// is derived deterministically from the actual score in analyze.ts, not left to the
// model's self-assessment (it was prone to calling a same-city guess "close").
export const SelfCheckSchema = z.object({
  summary: z
    .string()
    .describe(
      "2-4 sentence reflection on the guess now that the real location is known: what held up and what didn't.",
    ),
  mistakes: z
    .array(
      z.object({
        clueLabel: z
          .string()
          .describe(
            "The label of the clue that was wrong or misleading, copied exactly from the original clue list, or 'Overall guess' if the mistake wasn't tied to one specific clue.",
          ),
        whatWasWrong: z
          .string()
          .describe("What that clue or the final guess got wrong, stated concretely."),
        actually: z
          .string()
          .describe("What's actually true about the real location that contradicts it."),
      }),
    )
    .describe(
      "Specific, important things the analysis got wrong, ranked most important first. Empty array if nothing significant was wrong — don't invent minor nitpicks just to fill this in.",
    ),
});

export type SelfCheckParsed = z.infer<typeof SelfCheckSchema>;
