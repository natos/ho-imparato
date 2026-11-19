"use client";

export async function api<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: body instanceof FormData ? undefined : { "content-type": "application/json" },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data as T;
}

/** Passkey dialogs throw when the user cancels — turn those into a friendly message. */
export function passkeyError(e: unknown) {
  const err = e as Error;
  if (err?.name === "NotAllowedError" || err?.name === "AbortError") {
    return "Passkey cancelled. Tap the button to try again.";
  }
  if (err?.name === "InvalidStateError") {
    return "This device already has a passkey for this player.";
  }
  return err?.message ?? "Something went wrong. Try again.";
}
