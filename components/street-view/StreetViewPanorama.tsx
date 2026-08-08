"use client";

import { useEffect, useRef, useState } from "react";
import { loadStreetView } from "@/lib/maps/loader";

export interface StreetViewPov {
  heading: number;
  pitch: number;
  zoom: number;
}

interface StreetViewPanoramaProps {
  panoId: string;
  onReady?: () => void;
  /** Exposes a snapshot function the parent can call at "submit" time. */
  onPanoramaReady?: (getPov: () => StreetViewPov) => void;
}

/**
 * A fixed-position Street View panorama the user can pan and zoom, but
 * never navigate away from (no links control, no click-to-go, no address
 * control that could reveal the location).
 */
export default function StreetViewPanorama({
  panoId,
  onReady,
  onPanoramaReady,
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
          pov: { heading: Math.random() * 360, pitch: 0 },
          zoom: 0,
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

        onPanoramaReady?.(() => {
          const pov = panorama.getPov();
          return { heading: pov.heading, pitch: pov.pitch, zoom: panorama.getZoom() };
        });

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
