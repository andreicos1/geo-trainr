"use client";

import { useEffect, useRef, useState } from "react";
import { loadStreetView } from "@/lib/maps/loader";

interface StreetViewPanoramaProps {
  panoId: string;
  /** Initial heading/pitch/zoom, chosen once per round by the caller. */
  initialPov: { heading: number; pitch: number; zoom: number };
  onReady?: () => void;
}

/**
 * A fixed-position Street View panorama the user can pan and zoom, but
 * never navigate away from (no links control, no click-to-go, no address
 * control that could reveal the location).
 */
export default function StreetViewPanorama({
  panoId,
  initialPov,
  onReady,
}: StreetViewPanoramaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState(initialPov.heading);

  useEffect(() => {
    let cancelled = false;

    loadStreetView()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
          pano: panoId,
          pov: { heading: initialPov.heading, pitch: initialPov.pitch },
          zoom: initialPov.zoom,
          addressControl: false,
          linksControl: false,
          clickToGo: false,
          panControl: true,
          zoomControl: true,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          showRoadLabels: false,
          imageDateControl: false,
        });

        panorama.addListener("pov_changed", () => {
          setHeading(panorama.getPov().heading);
        });

        panoramaRef.current = panorama;
        onReady?.();
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Street View.");
        }
      });

    return () => {
      cancelled = true;
      panoramaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panoId]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/80 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <Compass heading={heading} />
    </div>
  );
}

/** Degrees of arc visible across the compass bar, and how wide that bar is. */
const COMPASS_WIDTH = 240;
const COMPASS_ARC = 120;
const PX_PER_DEG = COMPASS_WIDTH / COMPASS_ARC;

/** Every 15° gets a tick; multiples of 45° are labelled. */
const COMPASS_MARKS = Array.from({ length: 24 }, (_, i) => i * 15).map((angle) => ({
  angle,
  label: angle % 45 === 0 ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][angle / 45] : null,
  cardinal: angle % 90 === 0,
}));

/**
 * GeoGuessr-style compass: a horizontal strip of cardinal directions at the
 * top of the panorama that scrolls under a fixed centre marker as you pan.
 */
function Compass({ heading }: { heading: number }) {
  // Three copies of the 360° strip so the ends never scroll into view.
  const copies = [-360, 0, 360];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2"
    >
      <div
        className="relative h-9 overflow-hidden rounded-full bg-black/50 backdrop-blur"
        style={{
          width: COMPASS_WIDTH,
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div
          className="absolute left-1/2 top-0 h-full w-0"
          style={{ transform: `translateX(${-heading * PX_PER_DEG}px)` }}
        >
          {copies.map((offset) =>
            COMPASS_MARKS.map(({ angle, label, cardinal }) => (
              <div
                key={`${offset}-${angle}`}
                className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center justify-center"
                style={{ left: (angle + offset) * PX_PER_DEG }}
              >
                {label ? (
                  <span
                    className={
                      label === "N"
                        ? "text-[13px] font-bold leading-none text-red-400"
                        : cardinal
                          ? "text-[13px] font-bold leading-none text-white"
                          : "text-[10px] font-semibold leading-none text-white/50"
                    }
                  >
                    {label}
                  </span>
                ) : (
                  <span className="h-1.5 w-px bg-white/30" />
                )}
              </div>
            )),
          )}
        </div>
      </div>

      {/* Fixed centre marker: the direction you are currently facing. */}
      <div className="absolute left-1/2 top-0 h-9 w-px -translate-x-1/2 bg-red-400/70" />
      <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-red-400" />
    </div>
  );
}
