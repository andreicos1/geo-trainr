import "server-only";
import { zodFunction } from "openai/helpers/zod";
import { getOpenRouterClient, OPENROUTER_MODEL } from "./client";
import { RoundAnalysisSchema } from "./schema";
import {
  COUNTRY_COVERAGE,
  CONTINENTS,
  getCountry,
  getCountriesForContinent,
} from "@/lib/geo/countries-coverage";
import type { AiGuess, Clue, GameScope, RoundAnalysis } from "@/types/game";

const IMAGE_SIZE = 640;
const TOOL_NAME = "submit_round_analysis";

interface FetchImageArgs {
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  zoom: number;
}

function fovFromZoom(zoom: number): number {
  // Street View Static API fov is roughly the inverse of the panorama's
  // zoom-driven field of view; clamp to the API's documented 10-120 range.
  const fov = 180 / Math.pow(2, zoom);
  return Math.min(120, Math.max(10, Math.round(fov)));
}

async function fetchStreetViewImage({
  lat,
  lng,
  heading,
  pitch,
  zoom,
}: FetchImageArgs): Promise<{ dataUrl: string; width: number; height: number }> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("No Google Maps API key configured for the server.");
  }

  const params = new URLSearchParams({
    size: `${IMAGE_SIZE}x${IMAGE_SIZE}`,
    location: `${lat},${lng}`,
    heading: String(heading),
    pitch: String(pitch),
    fov: String(fovFromZoom(zoom)),
    source: "outdoor",
    key: apiKey,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/streetview?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Street View Static API request failed: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * Describes the game's scope restriction to the model, and lists the exact
 * set of countries it's allowed to guess among. Without this, the AI would
 * play a harder, unconstrained version of the game than the human — who
 * always knows (and sees in the UI) whether they're guessing worldwide, a
 * specific continent, or a single country — and it could "guess" a country
 * with no Street View coverage at all, which the human never could since
 * every round is sampled from `COUNTRY_COVERAGE`.
 */
function describeScopeConstraint(scope: GameScope): string {
  if (scope.type === "country") {
    const name = getCountry(scope.code)?.name ?? scope.code;
    return `This game is restricted to a single country: the image is guaranteed to be from somewhere inside ${name}. Set "country" to "${name}" and give your best-guess latitude/longitude within it.`;
  }

  if (scope.type === "continent") {
    const label = CONTINENTS.find((c) => c.code === scope.code)?.label ?? scope.code;
    const countries = getCountriesForContinent(scope.code).map((c) => c.name);
    return `This game is restricted to ${label}. The image is guaranteed to be from one of these countries (the only ones with Street View coverage there): ${countries.join(", ")}. Set "country" to exactly one of these names.`;
  }

  const countries = COUNTRY_COVERAGE.map((c) => c.name);
  return `This game draws locations only from countries with Google Street View coverage. The image is guaranteed to be from one of these countries: ${countries.join(", ")}. Set "country" to exactly one of these names — never a country outside this list.`;
}

function buildSystemPrompt(scope: GameScope): string {
  return `You are an expert GeoGuessr player analyzing a single Street View image.

${describeScopeConstraint(scope)}

Identify 3 to 8 distinct, specific visual clues in the image that a skilled player would use to narrow down the location: things like road markings and signage, license plates, architecture and roofing style, vegetation and terrain, road/bollard/pole design, driving side, writing systems or languages visible, and similar. For each clue, give a tight bounding box around exactly where it appears in the image, normalized to a 0-1 fraction of the image's width and height (x/y is the top-left corner).

Then give your own single best-guess location: a country, latitude/longitude, and a confidence from 0 to 1. Base the guess on the clues you identified, weighing them the way an expert would.

Be specific and concrete in every clue explanation — name the actual detail you're looking at, not a generic category.

Call the ${TOOL_NAME} tool exactly once with your full analysis. Do not respond with plain text.`;
}

const analysisTool = zodFunction({
  name: TOOL_NAME,
  description: "Submit the visual clue breakdown and best-guess location for this Street View image.",
  parameters: RoundAnalysisSchema,
});

export async function analyzeRound(
  args: FetchImageArgs & { scope: GameScope },
): Promise<RoundAnalysis> {
  const { scope, ...imageArgs } = args;
  const image = await fetchStreetViewImage(imageArgs);

  const client = getOpenRouterClient();

  const completion = await client.chat.completions.parse({
    model: OPENROUTER_MODEL,
    max_tokens: 4000,
    tools: [analysisTool],
    tool_choice: { type: "function", function: { name: TOOL_NAME } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: image.dataUrl } },
          { type: "text", text: buildSystemPrompt(scope) },
        ],
      },
    ],
  });

  const toolCall = completion.choices[0]?.message.tool_calls?.[0];
  const parsed = toolCall?.function.parsed_arguments as
    | ReturnType<typeof RoundAnalysisSchema.parse>
    | undefined;

  if (!parsed) {
    throw new Error("The model did not return a structured analysis.");
  }

  const clues: Clue[] = parsed.clues.map((c) => ({
    label: c.label,
    explanation: c.explanation,
    boundingBox: {
      x: clamp01(c.boundingBox.x),
      y: clamp01(c.boundingBox.y),
      width: clamp01(c.boundingBox.width),
      height: clamp01(c.boundingBox.height),
    },
    suggests: c.suggests ?? undefined,
  }));

  const aiGuess: AiGuess = {
    country: parsed.guess.country,
    lat: parsed.guess.lat,
    lng: parsed.guess.lng,
    confidence: clamp01(parsed.guess.confidence),
    reasoningSummary: parsed.guess.reasoningSummary,
  };

  return { image, clues, aiGuess };
}
