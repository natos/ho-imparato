"use client";

import { useSyncExternalStore } from "react";
import { isMuted, setMuted, sfx, subscribeMute } from "@/lib/sfx";

export function SoundToggle() {
  const muted = useSyncExternalStore(subscribeMute, isMuted, () => false);
  return (
    <button
      type="button"
      onClick={() => {
        setMuted(!muted);
        if (muted) sfx.pop();
      }}
      role="switch"
      aria-checked={!muted}
      aria-label="Suoni (sound effects)"
      className={`flex h-11 items-center gap-2 rounded-full border-[3px] border-[var(--edge)] px-3 font-extrabold ${
        muted ? "bg-[var(--surface)] text-[var(--muted)]" : "bg-[var(--basil)] text-white"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
        {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}
      </svg>
      <span aria-hidden>{muted ? "No" : "Sì"}</span>
    </button>
  );
}
