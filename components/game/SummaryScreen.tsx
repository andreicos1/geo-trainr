"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { describeScope } from "@/lib/geo/countries-coverage";
import { saveGame } from "@/lib/storage/game-history";
import type { CompletedRound, GameScope } from "@/types/game";
import { MAX_SCORE_PER_GAME, MAX_SCORE_PER_ROUND } from "@/types/game";

interface SummaryScreenProps {
  scope: GameScope;
  rounds: CompletedRound[];
}

export default function SummaryScreen({ scope, rounds }: SummaryScreenProps) {
  const router = useRouter();
  const saved = useRef(false);

  const totalScore = rounds.reduce((sum, r) => sum + r.score, 0);
  const totalAiScore = rounds.reduce((sum, r) => sum + (r.aiScore ?? 0), 0);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    saveGame({
      id: crypto.randomUUID(),
      playedAt: new Date().toISOString(),
      scope,
      rounds: rounds.map((r) => ({
        roundIndex: r.roundIndex,
        actual: r.actual,
        guess: r.guess,
        aiGuess: r.analysis
          ? {
              lat: r.analysis.aiGuess.lat,
              lng: r.analysis.aiGuess.lng,
              country: r.analysis.aiGuess.country,
              confidence: r.analysis.aiGuess.confidence,
            }
          : null,
        distanceKm: r.distanceKm,
        aiDistanceKm: r.aiDistanceKm,
        score: r.score,
        aiScore: r.aiScore,
        maxScore: MAX_SCORE_PER_ROUND,
      })),
      totalScore,
      totalAiScore,
      totalMaxScore: MAX_SCORE_PER_GAME,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const winner =
    totalScore === totalAiScore ? "tie" : totalScore > totalAiScore ? "you" : "ai";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Game Summary</h1>
        <p className="text-slate-400">{describeScope(scope)}</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-center">
          <div className="text-xs uppercase tracking-wide text-slate-400">You</div>
          <div className="text-3xl font-bold text-sky-400">{totalScore.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-center">
          <div className="text-xs uppercase tracking-wide text-slate-400">AI</div>
          <div className="text-3xl font-bold text-orange-400">{totalAiScore.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-center">
          <div className="text-xs uppercase tracking-wide text-slate-400">Max Possible</div>
          <div className="text-3xl font-bold text-emerald-400">
            {MAX_SCORE_PER_GAME.toLocaleString()}
          </div>
        </div>
      </div>

      <p className="text-center text-lg font-semibold text-white">
        {winner === "tie" && "It's a tie!"}
        {winner === "you" && "You beat the AI! 🎉"}
        {winner === "ai" && "The AI won this time."}
      </p>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Round</th>
              <th className="px-3 py-2 text-right font-medium">Your Score</th>
              <th className="px-3 py-2 text-right font-medium">Your Distance</th>
              <th className="px-3 py-2 text-right font-medium">AI Score</th>
              <th className="px-3 py-2 text-right font-medium">AI Distance</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r.roundIndex} className="border-t border-white/10 text-slate-200">
                <td className="px-3 py-2">{r.roundIndex + 1}</td>
                <td className="px-3 py-2 text-right">{r.score.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{r.distanceKm.toFixed(0)} km</td>
                <td className="px-3 py-2 text-right">{r.aiScore?.toLocaleString() ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  {r.aiDistanceKm != null ? `${r.aiDistanceKm.toFixed(0)} km` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-white transition hover:bg-emerald-400"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
