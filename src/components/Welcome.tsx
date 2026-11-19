"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, MotionConfig, useAnimationControls } from "motion/react";
import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { api, passkeyError } from "@/lib/api";
import { sfx } from "@/lib/sfx";
import { AvatarPicker } from "./AvatarPicker";
import { RecoveryCode } from "./RecoveryCode";
import { Wordmark } from "./Wordmark";

type Step = "start" | "recover" | "code" | "picture";
type Where = "signup" | "signin" | "recover";

const noop = () => () => {};
const RETURNING_KEY = "hi_returning";

function readReturning() {
  try {
    return localStorage.getItem(RETURNING_KEY) === "1";
  } catch {
    return false;
  }
}
function markReturning() {
  try {
    localStorage.setItem(RETURNING_KEY, "1");
  } catch {
    /* ignore */
  }
}

type RegOptions = Parameters<typeof startRegistration>[0]["optionsJSON"];
type AuthOptions = Parameters<typeof startAuthentication>[0]["optionsJSON"];

export function Welcome({ inviteRequired }: { inviteRequired: boolean }) {
  const router = useRouter();
  const shake = useAnimationControls();
  const [step, setStep] = useState<Step>("start");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [busy, setBusy] = useState<Where | null>(null);
  const [error, setError] = useState<{ where: Where; text: string } | null>(null);
  const supported = useSyncExternalStore(noop, browserSupportsWebAuthn, () => true);
  // This device has signed in before → lead with "Welcome back".
  const returning = useSyncExternalStore(noop, readReturning, () => false);

  function oops(where: Where, text: string) {
    setError({ where, text });
    sfx.nope();
    void shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.35 } });
  }

  // Returning players: the browser offers their passkey when they tap the name field.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await browserSupportsWebAuthnAutofill())) return;
      try {
        const options = await api<AuthOptions>("/api/auth/login/options");
        const response = await startAuthentication({ optionsJSON: options, useBrowserAutofill: true });
        if (cancelled) return;
        await api("/api/auth/login/verify", response);
        markReturning();
        sfx.bravo();
        router.refresh();
      } catch {
        /* autofill aborted or dismissed — the buttons still work */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return oops("signup", "Type your name first — at least 2 letters.");
    if (inviteRequired && !invite.trim()) return oops("signup", "Type the invite code you were given.");
    setBusy("signup");
    try {
      const options = await api<RegOptions>("/api/auth/register/options", { name, invite });
      const response = await startRegistration({ optionsJSON: options });
      const res = await api<{ recoveryCode: string }>("/api/auth/register/verify", response);
      setRecoveryCode(res.recoveryCode);
      markReturning();
      sfx.bravo();
      setStep("code");
    } catch (e) {
      oops("signup", passkeyError(e));
    } finally {
      setBusy(null);
    }
  }

  async function signIn() {
    setError(null);
    setBusy("signin");
    try {
      const options = await api<AuthOptions>("/api/auth/login/options");
      const response = await startAuthentication({ optionsJSON: options });
      await api("/api/auth/login/verify", response);
      markReturning();
      sfx.bravo();
      router.refresh();
    } catch (e) {
      oops("signin", passkeyError(e));
      setBusy(null);
    }
  }

  async function recover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !code.trim()) return oops("recover", "Type your name and your recovery code.");
    setBusy("recover");
    try {
      const res = await api<{ recoveryCode: string }>("/api/auth/recover", { name, code });
      setRecoveryCode(res.recoveryCode);
      markReturning();
      sfx.bravo();
      setStep("code");
    } catch (e) {
      oops("recover", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const errorFor = (where: Where) =>
    error?.where === where ? (
      <p role="alert" className="error text-[15px]">
        {error.text}
      </p>
    ) : null;

  const unsupported = !supported ? { "data-unsupported": "" } : {};

  const signUpBlock = (
    <form onSubmit={createAccount} noValidate className="flex flex-col gap-3 p-5">
      <h2 className="font-display text-2xl">{returning ? "New player?" : "New player"}</h2>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Your name</span>
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Come ti chiami?"
          autoComplete="username webauthn"
          maxLength={24}
        />
      </label>
      {inviteRequired && (
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Invite code</span>
          <input className="field" value={invite} onChange={(e) => setInvite(e.target.value)} autoComplete="off" autoCapitalize="none" />
        </label>
      )}
      <button className={`btn mt-2 ${returning ? "btn-secondary" : "btn-primary"}`} disabled={!!busy || !supported} {...unsupported}>
        <KeyIcon />
        {busy === "signup" ? "Waiting for passkey…" : "Sign up with passkey"}
      </button>
      {errorFor("signup")}
      {!supported && <p className="error text-sm">This browser doesn&apos;t support passkeys. Open the game in Safari, Chrome or Edge.</p>}
    </form>
  );

  const signInBlock = (
    <div className="flex flex-col gap-2 p-5">
      <h2 className="font-display text-2xl">{returning ? "Ciao di nuovo!" : "Played before?"}</h2>
      {returning && <p className="text-[var(--muted)]">Welcome back. Your passkey signs you straight in.</p>}
      <button type="button" className="btn btn-tomato mt-1" onClick={signIn} disabled={!!busy || !supported} {...unsupported}>
        <KeyIcon />
        {busy === "signin" ? "Waiting for passkey…" : "Sign in with passkey"}
      </button>
      {errorFor("signin")}
      <button type="button" className="btn btn-ghost" onClick={() => (setError(null), setStep("recover"))}>
        Lost your passkey? Use your recovery code
      </button>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-6 px-4 py-8">
        <header className="text-center">
          <Wordmark />
          <p className="mt-2 text-lg text-[var(--muted)]">Practise Italian together. Earn stars, outscore each other.</p>
        </header>

        <motion.section animate={shake} className="ticket">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {step === "start" &&
                (returning ? (
                  <>
                    {signInBlock}
                    <div className="ticket-perf">{signUpBlock}</div>
                  </>
                ) : (
                  <>
                    {signUpBlock}
                    <div className="ticket-perf">{signInBlock}</div>
                  </>
                ))}

              {step === "recover" && (
                <form onSubmit={recover} noValidate className="flex flex-col gap-3 p-5">
                  <h2 className="font-display text-2xl">Use recovery code</h2>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-semibold">Your name</span>
                    <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-semibold">Recovery code</span>
                    <input
                      className="field font-semibold tracking-widest uppercase"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX"
                      autoComplete="one-time-code"
                      autoCapitalize="characters"
                    />
                  </label>
                  <button className="btn btn-primary mt-2" disabled={!!busy}>
                    {busy === "recover" ? "Checking…" : "Sign in"}
                  </button>
                  {errorFor("recover")}
                  <button type="button" className="btn btn-ghost" onClick={() => (setError(null), setStep("start"))}>
                    Back
                  </button>
                </form>
              )}

              {step === "code" && <RecoveryCode code={recoveryCode} onDone={() => setStep("picture")} />}

              {step === "picture" && (
                <div className="flex flex-col items-center gap-5 p-6 text-center">
                  <h2 className="font-display text-2xl">Add your face</h2>
                  <p className="text-[var(--muted)]">Your rival sees it next to your score. You can skip this.</p>
                  <AvatarPicker name={name} initialUrl={null} />
                  <button className="btn btn-primary" onClick={() => router.refresh()}>
                    Andiamo!
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </main>
    </MotionConfig>
  );
}

export function KeyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
    </svg>
  );
}
