import { z } from "zod";
import { analyzeRound } from "@/lib/openrouter/analyze";

export const maxDuration = 60;

const gameScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("country"), code: z.string() }),
  z.object({ type: z.literal("continent"), code: z.enum(["EU", "AS", "AF", "NA", "SA", "OC"]) }),
  z.object({ type: z.literal("globe") }),
]);

const requestSchema = z.object({
  actualLat: z.number(),
  actualLng: z.number(),
  heading: z.number(),
  pitch: z.number(),
  zoom: z.number(),
  panoId: z.string().optional(),
  scope: gameScopeSchema,
  actualCountry: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { actualLat, actualLng, heading, pitch, zoom, scope, actualCountry } = parsed.data;

  try {
    const analysis = await analyzeRound({
      lat: actualLat,
      lng: actualLng,
      heading,
      pitch,
      zoom,
      scope,
      actualCountry,
    });
    return Response.json(analysis);
  } catch (err) {
    console.error("analyze-round failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "AI analysis failed." },
      { status: 502 },
    );
  }
}
