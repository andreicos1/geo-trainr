"use client";

import ScoreBadge from "./ScoreBadge";
import ClueOverlay from "./ClueOverlay";
import GuessMap from "@/components/guess-map/GuessMap";
import type { AiRoundResult, CompletedRound, SelfCheck } from "@/types/game";
import { MAX_SCORE_PER_ROUND, ROUNDS_PER_GAME } from "@/types/game";

const VERDICT_STYLES: Record<SelfCheck["verdict"], { label: string; className: string }> = {
  correct: { label: "Nailed it", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  close: { label: "Close", className: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  wrong: { label: "Missed", className: "border-red-400/30 bg-red-400/10 text-red-300" },
};

function SelfCheckSection({ selfCheck }: { selfCheck: SelfCheck }) {
  const verdict = VERDICT_STYLES[selfCheck.verdict];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${verdict.className}`}
        >
          {verdict.label}
        </span>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          AI Self-Check
        </h4>
      </div>
      <p className="text-sm text-slate-300">{selfCheck.summary}</p>
      {selfCheck.mistakes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {selfCheck.mistakes.map((mistake, i) => (
            <li key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <span className="font-semibold text-red-300">{mistake.clueLabel}:</span>{" "}
              <span className="text-slate-300">{mistake.whatWasWrong}</span>
              <p className="mt-1 text-slate-400">
                <span className="font-medium text-slate-300">Actually:</span> {mistake.actually}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface FeedbackScreenProps {
  round: CompletedRound;
  aiResult: AiRoundResult;
  onNext: () => void;
}

export default function FeedbackScreen({ round, aiResult, onNext }: FeedbackScreenProps) {
  const isLastRound = round.roundIndex === ROUNDS_PER_GAME - 1;
  const analysis = aiResult.status === "success" ? aiResult.analysis : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Round {round.roundIndex + 1} / {ROUNDS_PER_GAME}
        </h2>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-emerald-500 px-6 py-2 font-semibold text-white transition hover:bg-emerald-400"
        >
          {isLastRound ? "See Results" : "Next Round"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ScoreBadge
          label="Your Score"
          value={`${round.score.toLocaleString()} / ${MAX_SCORE_PER_ROUND.toLocaleString()}`}
          accentClassName="text-sky-400"
        />
        <ScoreBadge
          label="Your Distance"
          value={`${round.distanceKm.toFixed(0)} km`}
          accentClassName="text-sky-400"
        />
        <ScoreBadge
          label="AI Score"
          value={
            aiResult.status === "success"
              ? `${aiResult.aiScore.toLocaleString()} / ${MAX_SCORE_PER_ROUND.toLocaleString()}`
              : "—"
          }
          accentClassName="text-orange-400"
        />
        <ScoreBadge
          label="AI Distance"
          value={aiResult.status === "success" ? `${aiResult.aiDistanceKm.toFixed(0)} km` : "—"}
          accentClassName="text-orange-400"
        />
      </div>

      {/* Pins are shape-coded (pin / flag / spark badge) and their titles
          surface as native hover tooltips, so no separate color legend. */}
      <div className="relative h-96 overflow-hidden rounded-xl border border-white/10 sm:h-112">
        <GuessMap
          className="h-full w-full"
          readOnlyResult={{
            guess: round.guess,
            aiGuess: analysis ? { lat: analysis.aiGuess.lat, lng: analysis.aiGuess.lng } : null,
            actual: round.actual,
          }}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          AI Analysis
        </h3>

        {aiResult.status === "pending" && (
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-6 text-slate-300">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-sky-400" />
            Analyzing the Street View image for clues...
          </div>
        )}

        {aiResult.status === "error" && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-300">
            AI analysis unavailable: {aiResult.message}
          </div>
        )}

        {analysis && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <p>
                <span className="font-semibold text-orange-400">
                  AI guessed {analysis.aiGuess.country}
                </span>{" "}
                ({Math.round(analysis.aiGuess.confidence * 100)}% confidence) —{" "}
                {analysis.aiGuess.reasoningSummary}
              </p>
              {analysis.aiGuess.pinpointReasoning && (
                <p className="mt-2 text-slate-400">
                  <span className="font-medium text-slate-300">Why this exact spot:</span>{" "}
                  {analysis.aiGuess.pinpointReasoning}
                </p>
              )}
            </div>
            <ClueOverlay imageUrl={analysis.image.dataUrl} clues={analysis.clues} />
            {analysis.selfCheck && <SelfCheckSection selfCheck={analysis.selfCheck} />}
          </div>
        )}
      </div>
    </div>
  );
}
