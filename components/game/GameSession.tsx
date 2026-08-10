"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import RoundScreen from "./RoundScreen";
import FeedbackScreen from "./FeedbackScreen";
import SummaryScreen from "./SummaryScreen";
import { findRandomLocation } from "@/lib/geo/random-location";
import { haversineDistanceKm, mapDiagonalKm, scoreFromDistance } from "@/lib/geo/scoring";
import { clearActiveGame, getActiveGame, saveActiveGame, scopesEqual } from "@/lib/storage/active-game";
import type {
  AiRoundResult,
  CompletedRound,
  GamePhase,
  GameScope,
  LatLng,
  RoundAnalysis,
  RoundLocation,
} from "@/types/game";
import { ROUNDS_PER_GAME } from "@/types/game";

interface GameSessionProps {
  initialScope: GameScope;
}

interface GameState {
  phase: GamePhase;
  roundIndex: number;
  currentLocation: RoundLocation | null;
  rounds: CompletedRound[];
  aiResults: Record<number, AiRoundResult>;
  locationError: string | null;
}

type Action =
  | { type: "LOCATION_LOADING" }
  | { type: "LOCATION_READY"; location: RoundLocation }
  | { type: "LOCATION_ERROR"; message: string }
  | { type: "SUBMIT_GUESS"; round: CompletedRound }
  | { type: "AI_PENDING"; roundIndex: number }
  | {
      type: "AI_SUCCESS";
      roundIndex: number;
      analysis: RoundAnalysis;
      aiDistanceKm: number;
      aiScore: number;
    }
  | { type: "AI_ERROR"; roundIndex: number; message: string }
  | { type: "NEXT_ROUND" };

const initialState: GameState = {
  phase: "loading-location",
  roundIndex: 0,
  currentLocation: null,
  rounds: [],
  aiResults: {},
  locationError: null,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "LOCATION_LOADING":
      return { ...state, phase: "loading-location", locationError: null };
    case "LOCATION_READY":
      return { ...state, phase: "playing", currentLocation: action.location };
    case "LOCATION_ERROR":
      return { ...state, phase: "location-error", locationError: action.message };
    case "SUBMIT_GUESS":
      return { ...state, phase: "feedback", rounds: [...state.rounds, action.round] };
    case "AI_PENDING":
      return {
        ...state,
        aiResults: { ...state.aiResults, [action.roundIndex]: { status: "pending" } },
      };
    case "AI_SUCCESS":
      return {
        ...state,
        aiResults: {
          ...state.aiResults,
          [action.roundIndex]: {
            status: "success",
            analysis: action.analysis,
            aiDistanceKm: action.aiDistanceKm,
            aiScore: action.aiScore,
          },
        },
      };
    case "AI_ERROR":
      return {
        ...state,
        aiResults: {
          ...state.aiResults,
          [action.roundIndex]: { status: "error", message: action.message },
        },
      };
    case "NEXT_ROUND": {
      const nextIndex = state.roundIndex + 1;
      if (nextIndex >= ROUNDS_PER_GAME) {
        return { ...state, phase: "summary" };
      }
      return { ...state, phase: "loading-location", roundIndex: nextIndex, currentLocation: null };
    }
    default:
      return state;
  }
}

/**
 * The reducer's initial state — resumed from a matching game abandoned via
 * the X button, a tab close, or a refresh, when one exists (see
 * lib/storage/active-game.ts), otherwise the normal blank starting point.
 * Only ever called once, by `useReducer`'s lazy-init form, so a resume never
 * shows an intermediary "continue?" screen: by the time the player is
 * looking at a round, that round already *is* the resumed one.
 */
function computeInitialState(scope: GameScope): GameState {
  if (typeof window !== "undefined") {
    const active = getActiveGame();
    if (active && scopesEqual(active.scope, scope)) {
      return {
        phase: active.phase,
        roundIndex: active.roundIndex,
        // `country` was added after this schema shipped, so older
        // snapshots may be missing it — fall back to "" rather than widen
        // the RoundLocation type, since the AI analysis fetch will just
        // fall back to bbox reverse-lookup when it's blank (see analyze.ts).
        currentLocation: active.currentLocation
          ? { ...active.currentLocation, country: active.currentLocation.country ?? "" }
          : null,
        rounds: active.rounds,
        aiResults: active.aiResults as unknown as Record<number, AiRoundResult>,
        locationError: active.locationError,
      };
    }
  }
  return initialState;
}

export default function GameSession({ initialScope }: GameSessionProps) {
  const [state, dispatch] = useReducer(reducer, initialScope, computeInitialState);
  const [retryToken, setRetryToken] = useState(0);
  const diagonalKm = useMemo(() => mapDiagonalKm(initialScope), [initialScope]);

  // If the reducer's initial state above came from a resumed game already
  // mid-round, this holds that round's index — read once, straight off the
  // very first render's state — so the fetch effect below knows to keep the
  // resumed location instead of rolling a new random one. (Server-rendered
  // HTML has no localStorage, so this is always null there; the client's
  // first render can disagree when a matching abandoned game exists, which
  // React reconciles by taking the client value — the one case that matters
  // here.)
  const skipFetchRoundRef = useRef<number | null>(
    state.phase === "playing" || state.phase === "feedback" ? state.roundIndex : null,
  );

  // Find a random Street View location whenever a new round starts, and —
  // as soon as it's found — kick off the AI's analysis in the background.
  // The AI's image is captured at the round's fixed initial POV rather than
  // wherever the player ends up looking, so this doesn't have to wait for
  // (or care about) the player's guess at all: by the time they submit,
  // the analysis is often already done.
  function runAnalysis(roundIndex: number, location: RoundLocation) {
    dispatch({ type: "AI_PENDING", roundIndex });

    fetch("/api/analyze-round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualLat: location.actual.lat,
        actualLng: location.actual.lng,
        heading: location.initialPov.heading,
        pitch: location.initialPov.pitch,
        zoom: location.initialPov.zoom,
        panoId: location.panoId,
        scope: initialScope,
        actualCountry: location.country,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `AI analysis request failed (${res.status}).`);
        }
        return (await res.json()) as RoundAnalysis;
      })
      .then((analysis) => {
        const aiDistanceKm = haversineDistanceKm(
          { lat: analysis.aiGuess.lat, lng: analysis.aiGuess.lng },
          location.actual,
        );
        const aiScore = scoreFromDistance(aiDistanceKm, diagonalKm);
        dispatch({ type: "AI_SUCCESS", roundIndex, analysis, aiDistanceKm, aiScore });
      })
      .catch((err: unknown) => {
        dispatch({
          type: "AI_ERROR",
          roundIndex,
          message: err instanceof Error ? err.message : "AI analysis failed.",
        });
      });
  }

  // Runs once on mount: if the reducer's initial state resumed a round whose
  // AI analysis was still "pending", that request died with the previous
  // page and would otherwise never resolve — re-fire it. Reads `state` from
  // the closure rather than a dependency, since it only ever needs the
  // resumed snapshot from the very first render, before anything else has
  // had a chance to change it.
  useEffect(() => {
    if (skipFetchRoundRef.current === null) return;
    const ai = state.aiResults[state.roundIndex];
    if (state.currentLocation && (!ai || ai.status === "pending")) {
      runAnalysis(state.roundIndex, state.currentLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the persisted game in sync with every state change so the X
  // button, a tab close, or a refresh never loses progress. Cleared once
  // the game reaches its summary, since it's saved to permanent history at
  // that point (see SummaryScreen) and there's nothing left to resume.
  useEffect(() => {
    if (state.phase === "summary") {
      clearActiveGame();
      return;
    }
    saveActiveGame({
      scope: initialScope,
      phase: state.phase as "loading-location" | "playing" | "feedback" | "location-error",
      roundIndex: state.roundIndex,
      currentLocation: state.currentLocation,
      rounds: state.rounds,
      aiResults: state.aiResults as unknown as Record<string, AiRoundResult>,
      locationError: state.locationError,
    });
  }, [state, initialScope]);

  useEffect(() => {
    if (skipFetchRoundRef.current === state.roundIndex) return;

    let cancelled = false;
    dispatch({ type: "LOCATION_LOADING" });

    const roundIndex = state.roundIndex;

    findRandomLocation(initialScope)
      .then((location) => {
        if (cancelled) return;
        dispatch({ type: "LOCATION_READY", location });
        runAnalysis(roundIndex, location);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          dispatch({
            type: "LOCATION_ERROR",
            message: err instanceof Error ? err.message : "Failed to find a location.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundIndex, retryToken, initialScope]);

  function handleSubmit(guess: LatLng) {
    const location = state.currentLocation;
    if (!location) return;

    const distanceKm = haversineDistanceKm(guess, location.actual);
    const score = scoreFromDistance(distanceKm, diagonalKm);

    const round: CompletedRound = {
      roundIndex: state.roundIndex,
      actual: location.actual,
      guess,
      distanceKm,
      score,
    };
    dispatch({ type: "SUBMIT_GUESS", round });
  }

  function handleNext() {
    dispatch({ type: "NEXT_ROUND" });
  }

  if (state.phase === "loading-location") {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 text-slate-300">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
        <p>Finding a Street View location...</p>
      </div>
    );
  }

  if (state.phase === "location-error") {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 px-6 text-center text-slate-300">
        <p>{state.locationError}</p>
        <button
          type="button"
          onClick={() => setRetryToken((n) => n + 1)}
          className="rounded-full bg-sky-500 px-6 py-2 font-semibold text-white transition hover:bg-sky-400"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (state.phase === "playing" && state.currentLocation) {
    return (
      <RoundScreen
        roundIndex={state.roundIndex}
        panoId={state.currentLocation.panoId}
        initialPov={state.currentLocation.initialPov}
        onSubmit={handleSubmit}
      />
    );
  }

  if (state.phase === "feedback") {
    const round = state.rounds[state.roundIndex];
    if (!round) return null;
    const aiResult: AiRoundResult = state.aiResults[round.roundIndex] ?? { status: "pending" };
    return <FeedbackScreen round={round} aiResult={aiResult} onNext={handleNext} />;
  }

  if (state.phase === "summary") {
    return <SummaryScreen scope={initialScope} rounds={state.rounds} aiResults={state.aiResults} />;
  }

  return null;
}
