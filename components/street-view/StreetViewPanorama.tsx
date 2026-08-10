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

/** Rotating N/E/S/W dial showing which way the panorama is currently facing. */
function Compass({ heading }: { heading: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-4 left-4 z-10 flex h-32 w-32 items-center justify-center rounded-full bg-black/60 backdrop-blur"
    >
      <svg
        width="112"
        height="112"
        viewBox="0 0 40 40"
        className="transition-transform duration-150 ease-out"
        style={{ transform: `rotate(${-heading}deg)` }}
      >
        <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <line x1="20" y1="3" x2="20" y2="8" stroke="white" strokeWidth="1.5" />
        <line x1="20" y1="32" x2="20" y2="37" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <line x1="3" y1="20" x2="8" y2="20" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <line x1="32" y1="20" x2="37" y2="20" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <text x="20" y="15.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#f87171">
          N
        </text>
        <text x="20" y="27.5" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.6)">
          S
        </text>
        <text x="13" y="22.5" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.6)">
          W
        </text>
        <text x="27" y="22.5" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.6)">
          E
        </text>
      </svg>
    </div>
  );
}
