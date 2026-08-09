"use client";

import { useState } from "react";
import Link from "next/link";
import StreetViewPanorama from "@/components/street-view/StreetViewPanorama";
import GuessMap from "@/components/guess-map/GuessMap";
import type { LatLng } from "@/types/game";
import { ROUNDS_PER_GAME } from "@/types/game";

interface RoundScreenProps {
  roundIndex: number;
  panoId: string;
  initialPov: { heading: number; pitch: number; zoom: number };
  onSubmit: (guess: LatLng) => void;
}

// Discrete sizes the corner map can be pinned to via the diagonal-arrow
// resize buttons. Each step is also what hovering bumps up to from the step
// below, so hovering always previews "one size bigger" before settling back
// on mouse-out.
const MAP_SIZE_STEPS = [
  { w: "w-[25rem]", h: "h-[17.5rem]" },
  { w: "w-[min(56.25vw,35rem)]", h: "h-[min(50vh,26.25rem)]" },
  { w: "w-[min(95vw,85rem)]", h: "h-[min(88vh,62.5rem)]" },
] as const;

export default function RoundScreen({ roundIndex, panoId, initialPov, onSubmit }: RoundScreenProps) {
  const [guess, setGuess] = useState<LatLng | null>(null);
  const [sizeStep, setSizeStep] = useState(0);
  const [hovering, setHovering] = useState(false);

  function handleSubmit() {
    if (!guess) return;
    onSubmit(guess);
  }

  const effectiveStep = hovering ? Math.min(sizeStep + 1, MAP_SIZE_STEPS.length - 1) : sizeStep;
  const size = MAP_SIZE_STEPS[effectiveStep];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <StreetViewPanorama panoId={panoId} initialPov={initialPov} />

      <div className="absolute left-4 top-4 z-10 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
        Round {roundIndex + 1} / {ROUNDS_PER_GAME}
      </div>

      <Link
        href="/"
        aria-label="Exit to main menu"
        title="Exit to main menu"
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </Link>

      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`absolute bottom-4 right-4 z-20 flex flex-col items-stretch transition-all duration-300 ease-out ${size.w}`}
      >
        <div className={`relative overflow-hidden rounded-xl bg-slate-950 shadow-2xl ${size.h}`}>
          <div className="absolute left-2 top-2 z-10 flex gap-1">
            <button
              type="button"
              onClick={() => setSizeStep((s) => Math.min(MAP_SIZE_STEPS.length - 1, s + 1))}
              disabled={sizeStep === MAP_SIZE_STEPS.length - 1}
              aria-label="Enlarge map"
              title="Enlarge map"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 3l-7 7" />
                <path d="M3 21l7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSizeStep((s) => Math.max(0, s - 1))}
              disabled={sizeStep === 0}
              aria-label="Shrink map"
              title="Shrink map"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14h6v6" />
                <path d="M20 10h-6V4" />
                <path d="M14 10l7-7" />
                <path d="M3 21l7-7" />
              </svg>
            </button>
          </div>

          <GuessMap value={guess} onChange={setGuess} />
        </div>

        <button
          type="button"
          disabled={!guess}
          onClick={handleSubmit}
          className="mt-3 w-full shrink-0 rounded-full bg-emerald-500 px-8 py-3 text-center font-bold text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Guess
        </button>
      </div>
    </div>
  );
}
