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

  return <div ref={containerRef} className="h-full w-full" />;
}
