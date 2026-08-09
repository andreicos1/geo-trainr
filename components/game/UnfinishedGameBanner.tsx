"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { describeScope } from "@/lib/geo/countries-coverage";
import { scopeToParams } from "@/lib/geo/scope-params";
import { clearActiveGame, getActiveGame } from "@/lib/storage/active-game";
import type { ActiveGameState } from "@/types/active-game";
import { ROUNDS_PER_GAME } from "@/types/game";

/**
 * Only ever rendered client-side (see UnfinishedGameBannerLoader) — its
 * whole reason to exist is a synchronous localStorage read, which a server
 * render can never agree with, so it stays out of SSR entirely rather than
 * risk a hydration mismatch.
 */
export default function UnfinishedGameBanner() {
  const router = useRouter();
  const [unfinishedGame, setUnfinishedGame] = useState<ActiveGameState | null>(() =>
    getActiveGame(),
  );

  if (!unfinishedGame) return null;

  function continueGame() {
    router.push(`/play?${scopeToParams(unfinishedGame!.scope).toString()}`);
  }

  function discardGame() {
    clearActiveGame();
    setUnfinishedGame(null);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-sm text-slate-300">
        You have an unfinished game in{" "}
        <span className="font-semibold text-white">{describeScope(unfinishedGame.scope)}</span>
        {unfinishedGame.rounds.length > 0 &&
          ` — ${unfinishedGame.rounds.length} of ${ROUNDS_PER_GAME} rounds played`}
        .
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={continueGame}
          className="whitespace-nowrap rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={discardGame}
          className="whitespace-nowrap rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
