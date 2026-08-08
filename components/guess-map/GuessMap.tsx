"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { makePinIcon, PIN_COLORS, PIN_LABELS } from "@/lib/maps/pin-icon";
import type { LatLng } from "@/types/game";

const MUTED_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

interface GuessMapProps {
  /** Controlled mode: the user's current guess, updated by clicking. */
  value?: LatLng | null;
  onChange?: (value: LatLng) => void;
  /**
   * Read-only feedback mode: renders the user's guess, the AI's guess, and
   * the actual location, connected by lines, instead of taking clicks.
   */
  readOnlyResult?: {
    guess: LatLng;
    aiGuess?: LatLng | null;
    actual: LatLng;
  };
  className?: string;
}

export default function GuessMap({ value, onChange, readOnlyResult, className }: GuessMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const guessMarkerRef = useRef<google.maps.Marker | null>(null);
  const aiMarkerRef = useRef<google.maps.Marker | null>(null);
  const actualMarkerRef = useRef<google.maps.Marker | null>(null);
  const linesRef = useRef<google.maps.Polyline[]>([]);
  const onChangeRef = useRef(onChange);
  // The map loads asynchronously; this flips once it's ready so the marker
  // effects below (keyed on props that may already be set at mount time)
  // re-run instead of silently no-oping against a still-null map.
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Mount the map once.
  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;

      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 1,
        minZoom: 1,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: MUTED_MAP_STYLE,
      });
      mapRef.current = map;

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        onChangeRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });

      setMapReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // The map panel can resize (e.g. the expandable corner map in RoundScreen).
  // Google Maps doesn't pick that up on its own, so nudge it to re-tile and
  // re-center whenever the container's box changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) return;
      const center = map.getCenter();
      google.maps.event.trigger(map, "resize");
      if (center) map.setCenter(center);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Controlled guess marker (interactive mode).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || readOnlyResult) return;

    if (!value) {
      guessMarkerRef.current?.setMap(null);
      guessMarkerRef.current = null;
      return;
    }

    if (!guessMarkerRef.current) {
      guessMarkerRef.current = new google.maps.Marker({
        map,
        position: value,
        title: PIN_LABELS.guess,
        icon: makePinIcon("guess"),
      });
    } else {
      guessMarkerRef.current.setPosition(value);
    }
  }, [value, readOnlyResult, mapReady]);

  // Read-only feedback mode: three markers + connecting lines.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear any interactive-mode marker.
    guessMarkerRef.current?.setMap(null);
    guessMarkerRef.current = null;

    aiMarkerRef.current?.setMap(null);
    aiMarkerRef.current = null;
    actualMarkerRef.current?.setMap(null);
    actualMarkerRef.current = null;
    linesRef.current.forEach((line) => line.setMap(null));
    linesRef.current = [];

    if (!readOnlyResult) return;

    const { guess, aiGuess, actual } = readOnlyResult;
    const bounds = new google.maps.LatLngBounds();

    // Draw the actual-location pin first so guess/AI pins land on top when
    // they land close together.
    const actualMarker = new google.maps.Marker({
      map,
      position: actual,
      title: PIN_LABELS.actual,
      icon: makePinIcon("actual"),
      zIndex: 10,
    });
    actualMarkerRef.current = actualMarker;
    bounds.extend(actual);

    const userMarker = new google.maps.Marker({
      map,
      position: guess,
      title: PIN_LABELS.guess,
      icon: makePinIcon("guess"),
      zIndex: 20,
    });
    guessMarkerRef.current = userMarker;
    bounds.extend(guess);

    linesRef.current.push(
      new google.maps.Polyline({
        map,
        path: [guess, actual],
        strokeColor: PIN_COLORS.guess,
        strokeOpacity: 0.9,
        strokeWeight: 3,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
      }),
    );

    if (aiGuess) {
      const ai = new google.maps.Marker({
        map,
        position: aiGuess,
        title: PIN_LABELS.ai,
        icon: makePinIcon("ai"),
        zIndex: 20,
      });
      aiMarkerRef.current = ai;
      bounds.extend(aiGuess);
      linesRef.current.push(
        new google.maps.Polyline({
          map,
          path: [aiGuess, actual],
          strokeColor: PIN_COLORS.ai,
          strokeOpacity: 0.9,
          strokeWeight: 3,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
        }),
      );
    }

    map.fitBounds(bounds, 64);
  }, [readOnlyResult, mapReady]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}
