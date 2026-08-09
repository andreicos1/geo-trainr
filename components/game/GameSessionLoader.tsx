"use client";

import dynamic from "next/dynamic";

// ssr:false must be called from a Client Component (Next.js requirement) —
// this tiny wrapper is that boundary. GameSession's initial state can
// legitimately differ from a server render (a resumed game reads
// localStorage), so it's kept out of SSR entirely rather than risk a
// hydration mismatch; /play is already server-rendered per-request (its
// Page component reads searchParams), so this costs no static optimization
// that wasn't already given up.
const GameSession = dynamic(() => import("./GameSession"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 text-slate-300">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
      <p>Loading...</p>
    </div>
  ),
});

export default GameSession;
