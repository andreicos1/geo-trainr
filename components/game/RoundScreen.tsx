"use client";

import { useRef, useState } from "react";
import StreetViewPanorama, { type StreetViewPov } from "@/components/street-view/StreetViewPanorama";
import GuessMap from "@/components/guess-map/GuessMap";
import type { LatLng } from "@/types/game";
import { ROUNDS_PER_GAME } from "@/types/game";

interface RoundScreenProps {
  roundIndex: number;
  panoId: string;
  onSubmit: (guess: LatLng, pov: StreetViewPov) => void;
}

export default function RoundScreen({ roundIndex, panoId, onSubmit }: RoundScreenProps) {
  const [guess, setGuess] = useState<LatLng | null>(null);
  const getPovRef = useRef<(() => StreetViewPov) | null>(null);

  function handleSubmit() {
    if (!guess || !getPovRef.current) return;
    onSubmit(guess, getPovRef.current());
  }

  return (
    <div className="flex h-dvh w-full flex-col">
      <div className="relative flex-1">
        <StreetViewPanorama
          panoId={panoId}
          onPanoramaReady={(getPov) => {
            getPovRef.current = getPov;
          }}
        />
        <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
          Round {roundIndex + 1} / {ROUNDS_PER_GAME}
        </div>
      </div>

      <div className="relative h-64 border-t border-white/10 bg-slate-950 sm:h-72">
        <GuessMap value={guess} onChange={setGuess} />
        <button
          type="button"
          disabled={!guess}
          onClick={handleSubmit}
          className="absolute bottom-4 right-4 rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit Guess
        </button>
      </div>
    </div>
  );
}
