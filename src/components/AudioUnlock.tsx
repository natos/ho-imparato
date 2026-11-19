"use client";

import { useEffect } from "react";
import { installAudioUnlock } from "@/lib/sfx";

/** Mounted once in the root layout: unlocks Web Audio on the first tap (iOS needs a gesture). */
export function AudioUnlock() {
  useEffect(installAudioUnlock, []);
  return null;
}
