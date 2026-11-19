"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { sfx } from "@/lib/sfx";

const noop = () => () => {};

export function RecoveryCode({ code, onDone }: { code: string; onDone: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);

  function flash(text: string) {
    sfx.pop();
    setStatus(text);
    setTimeout(() => setStatus(null), 2000);
  }

  return (
    <div className="flex flex-col gap-4 p-6 text-center">
      <h2 className="font-display text-2xl">Save your recovery code</h2>
      <p className="text-[var(--muted)]">
        It&apos;s your way back in if you lose your passkey. Each code works once — you get a new one when you use it.
      </p>
      <motion.p
        initial={{ scale: 1.4, rotate: -6, opacity: 0 }}
        animate={{ scale: 1, rotate: -2, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 14 }}
        className="mx-auto rounded-lg border-[3px] border-dashed border-[var(--danger)] px-4 py-2 font-mono text-2xl font-bold tracking-widest text-[var(--danger)]"
      >
        {code}
      </motion.p>
      <div className="flex gap-3">
        {canShare && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              navigator
                .share({ title: "Ho imparato recovery code", text: `My Ho imparato recovery code: ${code}` })
                .then(() => flash("Saved"))
                .catch(() => {})
            }
          >
            Save to…
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            navigator.clipboard
              .writeText(code)
              .then(() => flash("Copiato!"))
              .catch(() => setStatus("Couldn't copy — write it down instead."))
          }
        >
          Copy
        </button>
      </div>
      <p aria-live="polite" className="min-h-6 font-semibold text-[var(--success)]">
        {status}
      </p>
      <button className="btn btn-primary" onClick={onDone}>
        Fatto, l&apos;ho salvato
      </button>
    </div>
  );
}
