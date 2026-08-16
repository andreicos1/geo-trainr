import "server-only";
import { zodFunction } from "openai/helpers/zod";
import {
  getOpenRouterClient,
  OPENROUTER_MODEL,
  OPENROUTER_SELF_CHECK_MODEL,
} from "./client";
import { SelfCheckSchema, RoundAnalysisSchema } from "./schema";
import {
  COUNTRY_COVERAGE,
  CONTINENTS,
  getCountry,
  getCountriesForContinent,
  findCountryByPoint,
} from "@/lib/geo/countries-coverage";
import { haversineDistanceKm, mapHalfScoreKm, scoreFromDistance } from "@/lib/geo/scoring";
import { MAX_SCORE_PER_ROUND } from "@/types/game";
import type { AiGuess, Clue, GameScope, SelfCheck, RoundAnalysis } from "@/types/game";

const IMAGE_SIZE = 640;
const TOOL_NAME = "submit_round_analysis";
const SELF_CHECK_TOOL_NAME = "submit_self_check";

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

// Score thresholds (out of MAX_SCORE_PER_ROUND) that decide the self-check
// verdict. Deliberately not left to the model's own judgment: it would
// sometimes call a guess "close" even when it landed in the same city,
// because it was reasoning about the guess qualitatively rather than off
// the actual scored distance.
const VERDICT_CORRECT_MIN_SCORE = 4200;
const VERDICT_CLOSE_MIN_SCORE = 1500;

function verdictFromScore(score: number): SelfCheck["verdict"] {
  if (score >= VERDICT_CORRECT_MIN_SCORE) return "correct";
  if (score >= VERDICT_CLOSE_MIN_SCORE) return "close";
  return "wrong";
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
    // The country is a given here, so an analysis that argues its way to
    // "${name}" tells the player nothing they didn't already know. Redirect
    // every part of the output that would otherwise be country-level —
    // reasoning, confidence, the clues themselves — at the only open
    // question: where inside ${name}.
    return `This game is restricted to a single country: the image is guaranteed to be from somewhere inside ${name}, and the player knows that. Set "country" to "${name}".

Because the country is given, identifying it is worth nothing here. Do not argue your way to ${name}, and do not present a clue as informative when all it does is confirm a country that was never in question. The entire task is placing the pin *within* ${name}:
- Prefer clues that discriminate between parts of ${name} — regional signage and place names, local plates or area codes, terrain, vegetation, climate cues, building materials and roofing, road class and infrastructure age, urban vs. rural density.
- "reasoningSummary" must explain how the clues narrow the location to a particular part of ${name}, never how they establish ${name}.
- "area" is the region or city you settled on, and "confidence" is how sure you are of *that area* — not of the country, which would trivially be 1.
- If the image genuinely doesn't narrow things down within ${name}, set "area" to null and say so plainly in "reasoningSummary". That is a more useful answer than inventing a region.`;
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

Then give your own single best-guess location: a country, the specific area (city/region) when the image narrows it that far, latitude/longitude, and a confidence from 0 to 1. Base the guess on the clues you identified, weighing them the way an expert would.

Be specific and concrete in every clue explanation — name the actual detail you're looking at, not a generic category. This applies especially to the final pin placement: don't silently default to a country's capital or biggest city. If a clue narrows the location to a specific city, region, coastline, or landscape, say which one and why; if nothing in the image narrows it beyond the country itself, say that explicitly rather than picking an unjustified specific point.

Call the ${TOOL_NAME} tool exactly once with your full analysis. Do not respond with plain text.`;
}

const analysisTool = zodFunction({
  name: TOOL_NAME,
  description: "Submit the visual clue breakdown and best-guess location for this Street View image.",
  parameters: RoundAnalysisSchema,
});

const selfCheckTool = zodFunction({
  name: SELF_CHECK_TOOL_NAME,
  description: "Submit a self-critique comparing the earlier guess against the real location.",
  parameters: SelfCheckSchema,
});

/**
 * Builds the follow-up prompt for the second call: it restates the first
 * call's output as plain text (rather than replaying the raw
 * tool-call/tool-response messages) since that's simpler to assemble
 * correctly and reads just as well to the model. The second call runs on a
 * different, cheaper model, so this restatement is the only way it sees the
 * guess at all — it's addressed in the second person to keep the critique
 * in the single "the AI grading itself" voice the UI presents.
 */
function buildSelfCheckPrompt(params: {
  clues: Clue[];
  aiGuess: AiGuess;
  actualLat: number;
  actualLng: number;
  actualCountry?: string;
  score: number;
  verdict: SelfCheck["verdict"];
  scope: GameScope;
}): string {
  const { clues, aiGuess, actualLat, actualLng, actualCountry, score, verdict, scope } = params;
  const cluesText = clues
    .map(
      (c, i) =>
        `${i + 1}. ${c.label} — ${c.explanation}${c.suggests ? ` (suggested: ${c.suggests})` : ""}`,
    )
    .join("\n");

  // In a country-locked game the country was handed to the original call, so
  // a critique that credits it for "correctly identifying ${country}" — or
  // that treats the revealed country as news — is empty. Only the
  // within-country placement was ever at stake.
  const countryLocked = scope.type === "country";
  const guessLine = `Your guess: ${aiGuess.area ? `${aiGuess.area}, ` : ""}${aiGuess.country} (${aiGuess.lat.toFixed(4)}, ${aiGuess.lng.toFixed(4)}), confidence ${aiGuess.confidence}.`;
  const reasoningLabel = countryLocked
    ? `Your reasoning for that part of ${aiGuess.country}`
    : "Your country-level reasoning";
  const revealLine = countryLocked
    ? `The real location has now been revealed: latitude ${actualLat.toFixed(4)}, longitude ${actualLng.toFixed(4)} — inside ${aiGuess.country}, as it was always going to be.`
    : `The real location has now been revealed${actualCountry ? `: it's in ${actualCountry}` : ""}, at latitude ${actualLat.toFixed(4)}, longitude ${actualLng.toFixed(4)}.`;
  const scopeNote = countryLocked
    ? ` This game was locked to ${aiGuess.country}, so the country was given to you up front — give yourself no credit for it and treat only the placement within ${aiGuess.country} as the thing being judged.`
    : "";

  return `Here is the analysis you just gave for this Street View image:

Clues you identified:
${cluesText}

${guessLine}
${reasoningLabel}: ${aiGuess.reasoningSummary}
Why you placed the pin there specifically: ${aiGuess.pinpointReasoning}

${revealLine}

The scoring system has already graded this guess at ${score}/${MAX_SCORE_PER_ROUND} and classified it as "${verdict}" based purely on distance — that part is fixed and not yours to reassess.${scopeNote} Your job here is just the narrative: look at the image again with the real answer in mind and be honest and specific about *why* it landed there. Did any of the clues you named point the wrong way or get a detail wrong? Only flag mistakes that actually matter — don't invent nitpicks to fill the list, and don't contradict the "${verdict}" rating in your summary (e.g. don't call it a near-miss if it was rated correct). Call the ${SELF_CHECK_TOOL_NAME} tool exactly once.`;
}

/**
 * Second, follow-up model call made after the real location is known,
 * critiquing the first call's guess. Runs on OPENROUTER_SELF_CHECK_MODEL:
 * the hard reasoning already happened in the first call, so this one only
 * needs to write up the comparison. Best-effort: a failure here shouldn't
 * take down a round whose original guess/clues already came back fine, so
 * errors are swallowed and logged instead of thrown.
 */
async function getSelfCheck(params: {
  client: ReturnType<typeof getOpenRouterClient>;
  image: { dataUrl: string };
  clues: Clue[];
  aiGuess: AiGuess;
  actualLat: number;
  actualLng: number;
  actualCountry?: string;
  scope: GameScope;
}): Promise<SelfCheck | undefined> {
  const { client, image, clues, aiGuess, actualLat, actualLng, scope } = params;
  // Prefer the country the round was actually sampled from (known with
  // certainty by the caller); fall back to a bbox reverse-lookup only if
  // that wasn't supplied — e.g. a resumed game from before this field
  // existed. The bbox lookup is approximate (rectangles, not real borders)
  // and was the source of occasional wrong-country mislabels in the
  // self-check text.
  const actualCountry = params.actualCountry || findCountryByPoint(actualLat, actualLng)?.name;

  const distanceKm = haversineDistanceKm({ lat: aiGuess.lat, lng: aiGuess.lng }, { lat: actualLat, lng: actualLng });
  const score = scoreFromDistance(distanceKm, mapHalfScoreKm(scope));
  const verdict = verdictFromScore(score);

  try {
    const completion = await client.chat.completions.parse({
      model: OPENROUTER_SELF_CHECK_MODEL,
      max_tokens: 1500,
      tools: [selfCheckTool],
      tool_choice: { type: "function", function: { name: SELF_CHECK_TOOL_NAME } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image.dataUrl } },
            {
              type: "text",
              text: buildSelfCheckPrompt({
                clues,
                aiGuess,
                actualLat,
                actualLng,
                actualCountry,
                score,
                verdict,
                scope,
              }),
            },
          ],
        },
      ],
    });

    const toolCall = completion.choices[0]?.message.tool_calls?.[0];
    const parsed = toolCall?.function.parsed_arguments as
      | ReturnType<typeof SelfCheckSchema.parse>
      | undefined;

    return parsed && { ...parsed, verdict };
  } catch (err) {
    console.error("self-check analysis failed:", err);
    return undefined;
  }
}

export async function analyzeRound(
  args: FetchImageArgs & { scope: GameScope; actualCountry?: string },
): Promise<RoundAnalysis> {
  const { scope, actualCountry, ...imageArgs } = args;
  const { lat: actualLat, lng: actualLng } = imageArgs;
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
    area: parsed.guess.area ?? undefined,
    lat: parsed.guess.lat,
    lng: parsed.guess.lng,
    confidence: clamp01(parsed.guess.confidence),
    reasoningSummary: parsed.guess.reasoningSummary,
    pinpointReasoning: parsed.guess.pinpointReasoning,
  };

  const selfCheck = await getSelfCheck({
    client,
    image,
    clues,
    aiGuess,
    actualLat,
    actualLng,
    actualCountry,
    scope,
  });

  return { image, clues, aiGuess, selfCheck };
}
