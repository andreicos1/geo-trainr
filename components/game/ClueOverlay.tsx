"use client";

import { useMemo, useState } from "react";
import type { Clue } from "@/types/game";

interface ClueOverlayProps {
  imageUrl: string;
  clues: Clue[];
}

export default function ClueOverlay({ imageUrl, clues }: ClueOverlayProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Bounding boxes can overlap (e.g. a small road sign inside a wider
  // storefront box). Rank z-index by area — smaller boxes on top — so every
  // box stays hoverable instead of being shadowed by a bigger one drawn
  // later in the list.
  const zIndexByIndex = useMemo(() => {
    const ranked = clues
      .map((clue, i) => ({ i, area: clue.boundingBox.width * clue.boundingBox.height }))
      .sort((a, b) => b.area - a.area); // largest first -> lowest z-index
    return new Map(ranked.map(({ i }, rank) => [i, rank + 1]));
  }, [clues]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full overflow-hidden rounded-lg border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- exact bytes from the server, no optimization needed */}
        <img src={imageUrl} alt="Street View capture analyzed by the AI" className="w-full" />
        {clues.map((clue, i) => {
          const isActive = activeIndex === i;
          const box = clue.boundingBox;
          // Flip the tooltip to stay inside the image near the edges.
          const tooltipBelow = box.y < 0.55;
          const tooltipAlign = box.x < 0.3 ? "left" : box.x + box.width > 0.7 ? "right" : "center";

          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(i)}
              onBlur={() => setActiveIndex(null)}
              className="absolute border-2 text-left transition"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
                borderColor: isActive ? "#fbbf24" : "rgba(56, 189, 248, 0.8)",
                backgroundColor: isActive ? "rgba(251, 191, 36, 0.15)" : "transparent",
                zIndex: isActive ? 100 : zIndexByIndex.get(i),
              }}
            >
              <span
                className="flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: isActive ? "#fbbf24" : "#0ea5e9" }}
              >
                {i + 1}
              </span>

              {isActive && (
                <div
                  className="pointer-events-none absolute z-10 w-56 max-w-[70vw] rounded-lg border border-amber-400/50 bg-slate-950/95 p-3 text-xs shadow-xl"
                  style={{
                    ...(tooltipBelow ? { top: "100%", marginTop: "0.5rem" } : { bottom: "100%", marginBottom: "0.5rem" }),
                    ...(tooltipAlign === "left"
                      ? { left: 0 }
                      : tooltipAlign === "right"
                        ? { right: 0 }
                        : { left: "50%", transform: "translateX(-50%)" }),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-300">{clue.label}</span>
                    {clue.suggests && (
                      <span className="ml-auto shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                        {clue.suggests}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-slate-300">{clue.explanation}</p>
                </div>
              )}
            </button>
          );
        })}
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
