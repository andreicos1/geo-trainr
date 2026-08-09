import type { GameScope } from "@/types/game";

/** The inverse of app/play/page.tsx's `parseScope` — builds the `/play` query string for a scope. */
export function scopeToParams(scope: GameScope): URLSearchParams {
  const params = new URLSearchParams({ scope: scope.type });
  if (scope.type === "country" || scope.type === "continent") {
    params.set("code", scope.code);
  }
  return params;
}
