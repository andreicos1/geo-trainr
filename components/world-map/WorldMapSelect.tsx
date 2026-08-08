"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import worldTopoJson from "world-atlas/countries-110m.json";
import { hasCoverage } from "@/lib/geo/countries-coverage";
import { PICKER_COLORS } from "@/lib/theme/picker-colors";

interface WorldMapSelectProps {
  selectedCode?: string;
  highlightedCodes?: Set<string>;
  onSelectCountry: (code: string) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export default function WorldMapSelect({
  selectedCode,
  highlightedCodes,
  onSelectCountry,
}: WorldMapSelectProps) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 0]);

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, z * 1.5));
  }

  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, z / 1.5));
  }

  function resetZoom() {
    setZoom(1);
    setCenter([0, 0]);
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950">
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-lg font-semibold text-white transition hover:bg-white/20"
        >
          +
        </button>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-lg font-semibold text-white transition hover:bg-white/20"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetZoom}
          aria-label="Reset zoom"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-xs font-semibold text-white transition hover:bg-white/20"
        >
          ⟲
        </button>
      </div>

      <ComposableMap
        projectionConfig={{ scale: 147 }}
        style={{ width: "100%", height: "auto" }}
      >
        <ZoomableGroup
          center={center}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={({ coordinates, zoom: z }) => {
            setCenter(coordinates);
            setZoom(z);
          }}
        >
          <Geographies geography={worldTopoJson as unknown as Record<string, unknown>}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const code = String(geo.id);
                const available = hasCoverage(code);
                const isSelected = available && selectedCode === code;
                const isHighlighted = available && !isSelected && highlightedCodes?.has(code);

                const fill = isSelected
                  ? PICKER_COLORS.selected
                  : isHighlighted
                    ? PICKER_COLORS.inScope
                    : available
                      ? PICKER_COLORS.available
                      : PICKER_COLORS.unavailable;
                const hoverFill = isSelected
                  ? PICKER_COLORS.selected
                  : isHighlighted
                    ? PICKER_COLORS.inScopeHover
                    : available
                      ? PICKER_COLORS.availableHover
                      : PICKER_COLORS.unavailable;
                const stroke = isSelected ? PICKER_COLORS.borderSelected : PICKER_COLORS.borderDefault;
                const strokeWidth = isSelected ? 1.75 : 0.5;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => {
                      if (available) onSelectCountry(code);
                    }}
                    style={{
                      default: {
                        fill,
                        stroke,
                        strokeWidth,
                        outline: "none",
                        cursor: available ? "pointer" : "default",
                        transition: "fill 150ms ease",
                        vectorEffect: "non-scaling-stroke",
                      },
                      hover: {
                        fill: hoverFill,
                        stroke,
                        strokeWidth,
                        outline: "none",
                        cursor: available ? "pointer" : "default",
                        vectorEffect: "non-scaling-stroke",
                      },
                      pressed: {
                        fill: PICKER_COLORS.selected,
                        stroke: PICKER_COLORS.borderSelected,
                        strokeWidth: 1.75,
                        outline: "none",
                        vectorEffect: "non-scaling-stroke",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
