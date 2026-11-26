"use client";

import Script from "next/script";
import { useEffect } from "react";

/*
  Sentioo feedback widget. Configured by environment, so moving from staging to production is
  an env change, not a code change:
    NEXT_PUBLIC_SENTIOO_KEY         the snt_… project key (public by design: it ships in the page)
    NEXT_PUBLIC_SENTIOO_WIDGET_URL  where widget.js lives (default: the production CDN)
    NEXT_PUBLIC_SENTIOO_API_URL     where feedback is sent (default: the widget's own, api.sentioo.io)
  No key → nothing loads and no feedback links show.

  The floating button is off: it would sit on top of the answer buttons and the feedback sheet.
  Feedback opens from our own links instead (FeedbackLink).
*/

const KEY = process.env.NEXT_PUBLIC_SENTIOO_KEY;
const WIDGET_URL = process.env.NEXT_PUBLIC_SENTIOO_WIDGET_URL || "https://cdn.sentioo.io/v1/widget.js";
const API_URL = process.env.NEXT_PUBLIC_SENTIOO_API_URL;

type Call = [string, ArrayLike<unknown>];
type SentiooStub = { q?: Call[]; identify?: (...a: unknown[]) => void; show?: (...a: unknown[]) => void; version?: string };

/** The documented stub: calls made before the widget loads are queued and replayed in order. */
function sentioo(): SentiooStub {
  const w = window as unknown as { Sentioo?: SentiooStub };
  if (!w.Sentioo) {
    const q: Call[] = [];
    w.Sentioo = {
      q,
      identify: (...a) => q.push(["identify", a]),
      show: (...a) => q.push(["show", a]),
    };
  }
  return w.Sentioo;
}

export const feedbackEnabled = Boolean(KEY);

export function FeedbackWidget() {
  if (!KEY) return null;
  return (
    <Script
      src={WIDGET_URL}
      strategy="afterInteractive"
      data-key={KEY}
      data-base-url={API_URL || undefined}
      data-source="ho-imparato"
      data-button="false"
      data-color="#1e4fd8"
      data-placeholder="What were you trying to do, and what happened?"
    />
  );
}

/** Attach the signed-in player to their feedback (id and name only). */
export function FeedbackIdentify({ id, name }: { id: string; name: string }) {
  useEffect(() => {
    if (KEY) sentioo().identify?.(id, { name });
  }, [id, name]);
  return null;
}

export function FeedbackLink({ className = "" }: { className?: string }) {
  if (!KEY) return null;
  return (
    <button type="button" onClick={() => sentioo().show?.()} className={`font-semibold underline underline-offset-4 ${className}`}>
      Lascia un feedback (send feedback)
    </button>
  );
}
