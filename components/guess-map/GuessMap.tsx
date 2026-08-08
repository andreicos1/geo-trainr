"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/maps/loader";
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
        zoom: 2,
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
    });

    return () => {
      cancelled = true;
    };
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
      guessMarkerRef.current = new google.maps.Marker({ map, position: value, title: "Your guess" });
    } else {
      guessMarkerRef.current.setPosition(value);
    }
  }, [value, readOnlyResult]);

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

    const userMarker = new google.maps.Marker({
      map,
      position: guess,
      title: "Your guess",
      label: { text: "Y", color: "#ffffff", fontWeight: "bold" },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#38bdf8", fillOpacity: 1, strokeColor: "#0f172a", strokeWeight: 2 },
    });
    guessMarkerRef.current = userMarker;
    bounds.extend(guess);

    const actualMarker = new google.maps.Marker({
      map,
      position: actual,
      title: "Actual location",
      label: { text: "A", color: "#ffffff", fontWeight: "bold" },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#22c55e", fillOpacity: 1, strokeColor: "#0f172a", strokeWeight: 2 },
    });
    actualMarkerRef.current = actualMarker;
    bounds.extend(actual);

    linesRef.current.push(
      new google.maps.Polyline({
        map,
        path: [guess, actual],
        strokeColor: "#38bdf8",
        strokeOpacity: 0.8,
        strokeWeight: 2,
      }),
    );

    if (aiGuess) {
      const ai = new google.maps.Marker({
        map,
        position: aiGuess,
        title: "AI guess",
        label: { text: "AI", color: "#ffffff", fontWeight: "bold" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#f97316", fillOpacity: 1, strokeColor: "#0f172a", strokeWeight: 2 },
      });
      aiMarkerRef.current = ai;
      bounds.extend(aiGuess);
      linesRef.current.push(
        new google.maps.Polyline({
          map,
          path: [aiGuess, actual],
          strokeColor: "#f97316",
          strokeOpacity: 0.8,
          strokeWeight: 2,
        }),
      );
    }

    map.fitBounds(bounds, 48);
  }, [readOnlyResult]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}
