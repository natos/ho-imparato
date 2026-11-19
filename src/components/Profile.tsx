"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import type { CurrentUser } from "@/lib/auth";
import { api, passkeyError } from "@/lib/api";
import { sfx } from "@/lib/sfx";
import { AvatarPicker } from "./AvatarPicker";
import { RecoveryCode } from "./RecoveryCode";
import { SoundToggle } from "./SoundToggle";

export function Profile({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState<"passkey" | "code" | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  async function addPasskey() {
    setBusy("passkey");
    setMsg(null);
    try {
      const options = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/auth/passkey/options");
      const response = await startRegistration({ optionsJSON: options });
      await api("/api/auth/passkey/verify", response);
      sfx.bravo();
      setMsg({ text: "Passkey added. You can sign in with it on this device.", ok: true });
    } catch (e) {
      sfx.nope();
      setMsg({ text: passkeyError(e), ok: false });
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    setBusy("code");
    setCodeError(null);
    try {
      const res = await api<{ recoveryCode: string }>("/api/auth/recovery-code");
      setNewCode(res.recoveryCode);
      setConfirming(false);
      sfx.bravo();
    } catch (e) {
      sfx.nope();
      setCodeError(`${(e as Error).message} Your old code still works.`);
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    await api("/api/auth/logout");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-5 px-4 py-6">
      <Link href="/" className="self-start font-semibold underline underline-offset-4">
        Torna alla mappa
      </Link>

      <section className="ticket flex flex-col items-center gap-4 p-6 text-center">
        <AvatarPicker name={user.name} initialUrl={user.avatarUrl} onChange={() => router.refresh()} />
        <h1 className="font-display text-3xl">{user.name}</h1>
      </section>

      <section className="ticket flex items-center gap-4 p-5">
        <div className="flex-1">
          <h2 className="font-display text-xl">Suoni e voce</h2>
          <p className="text-[var(--muted)]">Sound effects and the spoken Italian.</p>
        </div>
        <SoundToggle />
      </section>

      <section className="ticket flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl">Passkeys</h2>
        <p className="text-[var(--muted)]">
          Playing on a new phone or laptop that doesn&apos;t sync your passkeys? Add one for this device.
        </p>
        <button className="btn btn-primary" onClick={addPasskey} disabled={!!busy}>
          {busy === "passkey" ? "Waiting for passkey…" : "Add a passkey on this device"}
        </button>
        {msg && (
          <p role="status" className={msg.ok ? "font-semibold text-[var(--success)]" : "error"}>
            {msg.text}
          </p>
        )}
      </section>

      <section className="ticket flex flex-col gap-3">
        {newCode ? (
          <RecoveryCode code={newCode} onDone={() => setNewCode(null)} />
        ) : (
          <div className="flex flex-col gap-3 p-5">
            <h2 className="font-display text-xl">Recovery code</h2>
            <p className="text-[var(--muted)]">
              Lost it, or never saved it? Get a new one. Your old code stops working.
            </p>
            {confirming ? (
              <>
                <button className="btn btn-tomato" onClick={regenerate} disabled={!!busy}>
                  {busy === "code" ? "Making a new code…" : "Sì, cambia codice"}
                </button>
                <p className="text-sm text-[var(--muted)]">Your old code stops working as soon as you tap this.</p>
                <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={!!busy}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={() => setConfirming(true)}>
                Get a new recovery code
              </button>
            )}
            {codeError && (
              <p role="alert" className="error">
                {codeError}
              </p>
            )}
          </div>
        )}
      </section>

      <button className="btn btn-ghost" onClick={signOut}>
        Sign out
      </button>
    </main>
  );
}
