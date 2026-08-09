"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Clue } from "@/types/game";

interface ClueOverlayProps {
  imageUrl: string;
  clues: Clue[];
}

const TOOLTIP_WIDTH = 224; // px, matches w-56
const TOOLTIP_MARGIN = 8; // gap between the box/viewport edge and the tooltip, px

export default function ClueOverlay({ imageUrl, clues }: ClueOverlayProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function activate(index: number, target: HTMLElement) {
    setActiveIndex(index);
    setAnchorRect(target.getBoundingClientRect());
  }

  function deactivate() {
    setActiveIndex(null);
    setAnchorRect(null);
  }

  const activeClue = activeIndex !== null ? clues[activeIndex] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full overflow-hidden rounded-lg border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- exact bytes from the server, no optimization needed */}
        <img src={imageUrl} alt="Street View capture analyzed by the AI" className="w-full" />
        {clues.map((clue, i) => {
          const isActive = activeIndex === i;
          const box = clue.boundingBox;

          return (
            <div
              key={i}
              // Bounding boxes routinely nest (a small road sign inside a
              // wider storefront box). Rather than racing overlapping
              // rectangles for hover priority — which breaks down whenever
              // a "contained" box isn't a perfect geometric subset of its
              // parent — only the small numbered marker is interactive.
              // Markers sit at each box's own corner, so they essentially
              // never collide, and every clue stays reliably hoverable
              // regardless of how deeply its box is nested.
              className="pointer-events-none absolute"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
                zIndex: isActive ? 100 : 1,
              }}
            >
              <div
                className="absolute inset-0 border-2 transition"
                style={{
                  borderColor: isActive ? "#fbbf24" : "rgba(56, 189, 248, 0.8)",
                  backgroundColor: isActive ? "rgba(251, 191, 36, 0.15)" : "transparent",
                }}
              />
              <button
                type="button"
                onMouseEnter={(evt) => activate(i, evt.currentTarget)}
                onMouseLeave={deactivate}
                onFocus={(evt) => activate(i, evt.currentTarget)}
                onBlur={deactivate}
                className="pointer-events-auto absolute left-0 top-0 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: isActive ? "#fbbf24" : "#0ea5e9" }}
              >
                {i + 1}
              </button>
            </div>
          );
        })}
      </div>

      {/* Rendered in a portal at viewport coordinates so the tooltip always
          draws above every other element on the page (score badges, the map,
          the clue list) and is never clipped by this card's `overflow-hidden`. */}
      {activeClue &&
        anchorRect &&
        createPortal(<ClueTooltip clue={activeClue} anchorRect={anchorRect} />, document.body)}

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
              <span className="min-w-0 flex-1 truncate font-semibold text-white" title={clue.label}>
                {clue.label}
              </span>
              {clue.suggests && (
                <span className="ml-auto shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
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

function ClueTooltip({ clue, anchorRect }: { clue: Clue; anchorRect: DOMRect }) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const width = Math.min(TOOLTIP_WIDTH, viewportWidth - TOOLTIP_MARGIN * 2);
  const left = Math.min(
    Math.max(anchorRect.left + anchorRect.width / 2 - width / 2, TOOLTIP_MARGIN),
    viewportWidth - width - TOOLTIP_MARGIN,
  );

  // Flip above the box when there isn't room below the viewport.
  const showBelow =
    anchorRect.bottom + TOOLTIP_MARGIN + 140 <= viewportHeight || anchorRect.top < 140;
  const top = showBelow ? anchorRect.bottom + TOOLTIP_MARGIN : anchorRect.top - TOOLTIP_MARGIN;

  return (
    <div
      className="pointer-events-none fixed z-1000 rounded-lg border border-amber-400/50 bg-slate-950/95 p-3 text-xs shadow-xl"
      style={{
        left,
        top,
        width,
        transform: showBelow ? undefined : "translateY(-100%)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-semibold text-amber-300" title={clue.label}>
          {clue.label}
        </span>
        {clue.suggests && (
          <span className="ml-auto shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
            {clue.suggests}
          </span>
        )}
      </div>
      <p className="mt-1 text-slate-300">{clue.explanation}</p>
    </div>
  );
}
