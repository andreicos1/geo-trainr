import { activeGameSchema, type ActiveGameState } from "@/types/active-game";
import type { GameScope } from "@/types/game";

const ACTIVE_GAME_KEY = "geo-trainr:active-game";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function scopesEqual(a: GameScope, b: GameScope): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "country" && b.type === "country") return a.code === b.code;
  if (a.type === "continent" && b.type === "continent") return a.code === b.code;
  return true; // both "globe"
}

/** Reads the persisted in-progress game, if any. Never throws. */
export function getActiveGame(): ActiveGameState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_GAME_KEY);
    if (!raw) return null;
    const parsed = activeGameSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.warn("geo-trainr: failed to read active game", err);
    return null;
  }
}

/**
 * Overwrites the persisted in-progress game. Best-effort, like the rest of
 * local storage in this app — a quota error (e.g. a bulky AI clue image
 * pushing past private-mode Safari's cap) just means the next resume won't
 * be perfectly up to date, never a crash.
 */
export function saveActiveGame(state: Omit<ActiveGameState, "version" | "savedAt">): void {
  if (!isBrowser()) return;
  try {
    const payload: ActiveGameState = {
      version: 1,
      savedAt: new Date().toISOString(),
      ...state,
    };
    window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("geo-trainr: failed to save active game", err);
  }
}

export function clearActiveGame(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ACTIVE_GAME_KEY);
  } catch (err) {
    console.warn("geo-trainr: failed to clear active game", err);
  }
}
