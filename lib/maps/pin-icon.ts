/// <reference types="google.maps" />

export const PIN_COLORS = {
  guess: "#38bdf8",
  actual: "#22c55e",
  ai: "#f97316",
} as const;

export type PinKind = keyof typeof PIN_COLORS;

export const PIN_LABELS: Record<PinKind, string> = {
  guess: "Your guess",
  actual: "Actual location",
  ai: "AI guess",
};

/**
 * Distinct marker icon per pin kind, so the map is self-explanatory without
 * a color legend: a classic pin drop for the player's guess, a finish-line
 * flag for the actual location, and a spark badge for the AI's guess.
 * Callers should also set the marker's `title` (see `PIN_LABELS`) so
 * hovering surfaces the same label as a native tooltip.
 */
export function makePinIcon(kind: PinKind): google.maps.Icon {
  const color = PIN_COLORS[kind];

  if (kind === "actual") {
    // A flag planted in the ground — the pole's base is the exact spot.
    const svg = `
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="1" width="3" height="36" rx="1.5" fill="#0f172a" />
        <path d="M7 3 L27 8.5 L7 15 Z" fill="${color}" />
        <circle cx="5.5" cy="38" r="2.5" fill="#0f172a" />
      </svg>
    `.trim();
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(30, 40),
      anchor: new google.maps.Point(5.5, 38),
    };
  }

  if (kind === "ai") {
    // A spark badge — floats centered on the point rather than pointing at it.
    const svg = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="${color}" />
        <path d="M16 6 L18.5 13.5 L26 16 L18.5 18.5 L16 26 L13.5 18.5 L6 16 L13.5 13.5 Z" fill="white" />
      </svg>
    `.trim();
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16),
    };
  }

  // "guess" — the classic pin drop.
  const svg = `
    <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15 0C6.72 0 0 6.72 0 15c0 11.25 15 25 15 25s15-13.75 15-25C30 6.72 23.28 0 15 0z"
        fill="${color}"
      />
      <circle cx="15" cy="15" r="6" fill="white" />
    </svg>
  `.trim();
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(30, 40),
    anchor: new google.maps.Point(15, 40),
    labelOrigin: new google.maps.Point(15, 15),
  };
}
