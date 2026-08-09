"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import RoundScreen from "./RoundScreen";
import FeedbackScreen from "./FeedbackScreen";
import SummaryScreen from "./SummaryScreen";
import { findRandomLocation } from "@/lib/geo/random-location";
import { haversineDistanceKm, mapDiagonalKm, scoreFromDistance } from "@/lib/geo/scoring";
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

export default function GameSession({ initialScope }: GameSessionProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [retryToken, setRetryToken] = useState(0);
  const diagonalKm = useMemo(() => mapDiagonalKm(initialScope), [initialScope]);

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

  useEffect(() => {
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
