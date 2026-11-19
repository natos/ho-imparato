"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { sfx } from "@/lib/sfx";
import { Avatar } from "./Avatar";

const SIZE = 256;

/** Center-crop to a square and shrink to 256px in the browser before upload. */
async function toSquare(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bmp.close();
  const encode = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  // Safari can't encode WebP and silently returns PNG — fall back to JPEG instead.
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("Couldn't read that picture. Try another one.");
  return jpeg;
}

export function AvatarPicker({
  name,
  initialUrl,
  onChange,
}: {
  name: string;
  initialUrl: string | null;
  onChange?: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await toSquare(file);
      const form = new FormData();
      form.append("file", new File([blob], "avatar", { type: blob.type }));
      const res = await api<{ avatarUrl: string }>("/api/avatar", form);
      setUrl(res.avatarUrl);
      onChange?.(res.avatarUrl);
      sfx.pop();
    } catch (e) {
      setError((e as Error).message);
      sfx.nope();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api("/api/avatar", undefined, { method: "DELETE" });
      setUrl(null);
      onChange?.(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        whileTap={{ scale: 0.94 }}
        className="relative rounded-full disabled:opacity-60"
        aria-label={url ? "Change profile picture" : "Add a profile picture"}
      >
        <motion.span key={url ?? "none"} initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} className="block">
          <Avatar name={name} url={url} size={112} />
        </motion.span>
        <span className="absolute -right-1 bottom-1 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-[var(--edge)] bg-[var(--blue)] text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
      </motion.button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="flex gap-4 text-[15px]">
        <button type="button" className="font-semibold underline underline-offset-4" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : url ? "Change picture" : "Add a picture"}
        </button>
        {url && !busy && (
          <button type="button" className="text-[var(--muted)] underline underline-offset-4" onClick={remove}>
            Remove
          </button>
        )}
      </div>
      {error && <p className="error text-sm">{error}</p>}
    </div>
  );
}
