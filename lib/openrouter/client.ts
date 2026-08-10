import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Server-only singleton — never import this from a Client Component.
 * Talks to OpenRouter's OpenAI-compatible API (https://openrouter.ai/docs).
 */
export function getOpenRouterClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set. Add it to .env.local.");
    }
    client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        // Optional, only sent if configured — attributes usage to your app
        // in OpenRouter's dashboard/rankings. Neither is required to call the API.
        ...(process.env.OPENROUTER_SITE_URL
          ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL }
          : {}),
        ...(process.env.OPENROUTER_SITE_NAME
          ? { "X-Title": process.env.OPENROUTER_SITE_NAME }
          : {}),
      },
    });
  }
  return client;
}

export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "google/gemini-2.5-pro";

/**
 * Model for the self-check call. That call is much easier than the guess
 * itself — the answer, the score and the verdict are all handed to it, so
 * it only has to write the narrative — so it runs on a cheaper, faster
 * model to keep the wait after each round short.
 */
export const OPENROUTER_SELF_CHECK_MODEL =
  process.env.OPENROUTER_SELF_CHECK_MODEL || "google/gemini-2.5-flash";
