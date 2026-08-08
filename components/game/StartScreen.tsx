"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import WorldMapSelect from "@/components/world-map/WorldMapSelect";
import ContinentPicker from "@/components/world-map/ContinentPicker";
import {
  COUNTRY_COVERAGE,
  getCountriesForContinent,
} from "@/lib/geo/countries-coverage";
import { saveSettings } from "@/lib/storage/game-history";
import type { Continent, GameScope } from "@/types/game";

export default function StartScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<GameScope>({ type: "globe" });

  function selectContinent(code: Continent) {
    setScope({ type: "continent", code });
  }

  function selectGlobe() {
    setScope({ type: "globe" });
  }

  function selectCountry(code: string) {
    setScope({ type: "country", code });
  }

  function startGame() {
    saveSettings({ lastScope: scope });

    const params = new URLSearchParams({ scope: scope.type });
    if (scope.type === "country" || scope.type === "continent") {
      params.set("code", scope.code);
    }
    router.push(`/play?${params.toString()}`);
  }

  const selectedCountryCode = scope.type === "country" ? scope.code : undefined;
  const selectedContinentOrGlobe =
    scope.type === "continent"
      ? scope.code
      : scope.type === "globe"
        ? "globe"
        : undefined;

  const highlightedCodes = useMemo(() => {
    if (scope.type === "globe")
      return new Set(COUNTRY_COVERAGE.map((c) => c.code));
    if (scope.type === "continent") {
      return new Set(getCountriesForContinent(scope.code).map((c) => c.code));
    }
    return undefined;
  }, [scope]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight text-white">
          geotrainr
        </h1>
        <p className="text-slate-400">
          Pick a country, a continent, or the whole world. Play 5 rounds of
          Street View guessing against an AI that explains its reasoning.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Choose a region
          </h2>
          <button
            type="button"
            onClick={startGame}
            className="whitespace-nowrap rounded-full bg-emerald-500 px-6 py-2 font-semibold text-white transition hover:bg-emerald-400"
          >
            Start Game
          </button>
        </div>
        <ContinentPicker
          selected={selectedContinentOrGlobe}
          onSelectContinent={selectContinent}
          onSelectGlobe={selectGlobe}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Or pick a single country
        </h2>
        <WorldMapSelect
          selectedCode={selectedCountryCode}
          highlightedCodes={highlightedCodes}
          onSelectCountry={selectCountry}
        />
      </section>
    </div>
  );
}
