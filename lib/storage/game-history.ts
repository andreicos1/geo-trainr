import {
  historyEnvelopeSchema,
  settingsEnvelopeSchema,
  type AggregateStats,
  type GameRecord,
  type GameSettings,
} from "@/types/history";

const HISTORY_KEY = "geo-trainr:games";
const SETTINGS_KEY = "geo-trainr:settings";
const MAX_STORED_GAMES = 50;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson(key: string): unknown {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`geo-trainr: failed to read localStorage key "${key}"`, err);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Private-mode Safari / quota exceeded — degrade silently, this is
    // best-effort local persistence, never load-bearing for gameplay.
    console.warn(`geo-trainr: failed to write localStorage key "${key}"`, err);
  }
}

export function getAllGames(): GameRecord[] {
  const parsed = historyEnvelopeSchema.safeParse(readJson(HISTORY_KEY));
  if (!parsed.success) return [];
  return parsed.data.games;
}

export function getGame(id: string): GameRecord | undefined {
  return getAllGames().find((g) => g.id === id);
}

export function saveGame(game: GameRecord): void {
  const games = [game, ...getAllGames()].slice(0, MAX_STORED_GAMES);
  writeJson(HISTORY_KEY, { version: 1, games });
}

export function clearHistory(): void {
  writeJson(HISTORY_KEY, { version: 1, games: [] });
}

export function getSettings(): GameSettings {
  const parsed = settingsEnvelopeSchema.safeParse(readJson(SETTINGS_KEY));
  if (!parsed.success) return {};
  return parsed.data.settings;
}

export function saveSettings(settings: Partial<GameSettings>): void {
  const merged = { ...getSettings(), ...settings };
  writeJson(SETTINGS_KEY, { version: 1, settings: merged });
}

export function getAggregateStats(): AggregateStats {
  const games = getAllGames();
  if (games.length === 0) {
    return { gamesPlayed: 0, avgScore: 0, avgAiScore: 0, bestScore: 0 };
  }
  const totalScore = games.reduce((sum, g) => sum + g.totalScore, 0);
  const totalAiScore = games.reduce((sum, g) => sum + g.totalAiScore, 0);
  const bestScore = Math.max(...games.map((g) => g.totalScore));
  return {
    gamesPlayed: games.length,
    avgScore: Math.round(totalScore / games.length),
    avgAiScore: Math.round(totalAiScore / games.length),
    bestScore,
  };
}
