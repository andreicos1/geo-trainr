/**
 * Centralized color tokens for the region/country picker UI (StartScreen,
 * ContinentPicker, WorldMapSelect). Having one source for these keeps
 * "selected", "available", and "in scope" meaning the same hue everywhere
 * they show up, instead of each component picking its own.
 *
 * Hex values mirror Tailwind's sky/amber/emerald/slate scales, which are
 * already the accent colors used elsewhere in the app (CTAs, ScoreBadge,
 * ClueOverlay), so the picker doesn't introduce new hues to learn.
 */
export const PICKER_COLORS = {
  /** Interactive, not selected and not part of the current scope. */
  available: "#0ea5e9", // sky-500
  availableHover: "#38bdf8", // sky-400
  /** Countries inside the selected continent/globe scope, not individually selected. */
  inScope: "#f59e0b", // amber-500
  inScopeHover: "#fbbf24", // amber-400
  /** The exact thing that's selected (a single country, or an active continent/globe button). Matches the primary CTA color. */
  selected: "#10b981", // emerald-500
  /** No Street View coverage, not selectable. */
  unavailable: "#334155", // slate-700
  /** Map feature borders. */
  borderDefault: "#475569", // slate-600
  borderSelected: "#f8fafc", // slate-50
} as const;

/** Shared button styling for the continent/globe picker, so "selected" always reads the same. */
export const PICKER_BUTTON_CLASSES = {
  selected: "bg-emerald-500 text-white",
  default: "bg-white/10 text-slate-200 hover:bg-white/20",
} as const;
