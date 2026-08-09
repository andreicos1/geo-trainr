"use client";

import dynamic from "next/dynamic";

// ssr:false must be called from a Client Component (Next.js requirement) —
// this tiny wrapper is that boundary, kept separate from StartScreen so the
// rest of that page (which has no client-only data) still statically
// prerenders.
const UnfinishedGameBanner = dynamic(() => import("./UnfinishedGameBanner"), {
  ssr: false,
});

export default UnfinishedGameBanner;
