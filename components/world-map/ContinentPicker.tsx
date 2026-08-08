"use client";

import { CONTINENTS } from "@/lib/geo/countries-coverage";
import { PICKER_BUTTON_CLASSES } from "@/lib/theme/picker-colors";
import type { Continent } from "@/types/game";

interface ContinentPickerProps {
  selected?: Continent | "globe";
  onSelectContinent: (continent: Continent) => void;
  onSelectGlobe: () => void;
}

export default function ContinentPicker({
  selected,
  onSelectContinent,
  onSelectGlobe,
}: ContinentPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CONTINENTS.map((c) => (
        <button
          key={c.code}
          type="button"
          onClick={() => onSelectContinent(c.code)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            selected === c.code ? PICKER_BUTTON_CLASSES.selected : PICKER_BUTTON_CLASSES.default
          }`}
        >
          {c.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onSelectGlobe}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
          selected === "globe" ? PICKER_BUTTON_CLASSES.selected : PICKER_BUTTON_CLASSES.default
        }`}
      >
        Whole World
      </button>
    </div>
  );
}
