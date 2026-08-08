"use client";

import { useState } from "react";
import type { Clue } from "@/types/game";

interface ClueOverlayProps {
  imageUrl: string;
  clues: Clue[];
}

export default function ClueOverlay({ imageUrl, clues }: ClueOverlayProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full overflow-hidden rounded-lg border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- exact bytes from the server, no optimization needed */}
        <img src={imageUrl} alt="Street View capture analyzed by the AI" className="w-full" />
        {clues.map((clue, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(i)}
            onBlur={() => setActiveIndex(null)}
            className="absolute border-2 text-left transition"
            style={{
              left: `${clue.boundingBox.x * 100}%`,
              top: `${clue.boundingBox.y * 100}%`,
              width: `${clue.boundingBox.width * 100}%`,
              height: `${clue.boundingBox.height * 100}%`,
              borderColor: activeIndex === i ? "#fbbf24" : "rgba(56, 189, 248, 0.8)",
              backgroundColor: activeIndex === i ? "rgba(251, 191, 36, 0.15)" : "transparent",
            }}
          >
            <span
              className="flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: activeIndex === i ? "#fbbf24" : "#0ea5e9" }}
            >
              {i + 1}
            </span>
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-2">
        {clues.map((clue, i) => (
          <li
            key={i}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            className={`rounded-lg border px-3 py-2 transition ${
              activeIndex === i ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="font-semibold text-white">{clue.label}</span>
              {clue.suggests && (
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                  {clue.suggests}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-300">{clue.explanation}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
