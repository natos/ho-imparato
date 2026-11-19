"use client";

/**
 * Tiny synthesized sound effects — no audio files.
 * iOS only lets audio start inside a user gesture, so we unlock the context on
 * the first pointerdown anywhere (see installAudioUnlock) rather than mid-await.
 */
let ctx: AudioContext | null = null;
const MUTE_KEY = "hi_muted";

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* storage blocked — mute lasts for this page only */
  }
  window.dispatchEvent(new Event("hi-mute"));
}

export function subscribeMute(cb: () => void) {
  window.addEventListener("hi-mute", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("hi-mute", cb);
    window.removeEventListener("storage", cb);
  };
}

export function installAudioUnlock() {
  const unlock = () => {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "triangle", gain = 0.18) {
  if (typeof window === "undefined" || isMuted()) return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  /** rising arpeggio — success */
  bravo() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.07, 0.25));
  },
  /** soft pop — taps, copy */
  pop() {
    tone(880, 0, 0.08, "sine", 0.12);
  },
  /** low buzz — error */
  nope() {
    tone(160, 0, 0.18, "square", 0.08);
    tone(120, 0.1, 0.22, "square", 0.08);
  },
};
