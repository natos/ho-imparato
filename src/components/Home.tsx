"use client";

import { useState } from "react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import type { Player } from "@/lib/board";
import { sfx } from "@/lib/sfx";
import { Avatar } from "./Avatar";
import { Wordmark } from "./Wordmark";

/*
  Copy rule: game words in Italian (Tu, Gioca, Pari, Mappa, In arrivo),
  English only as a secondary gloss for anything instructional.
*/

// The Passato Prossimo route. Stops become playable once the lesson content is in.
const ROUTE = ["Torino", "Milano", "Venezia", "Bologna", "Firenze", "Roma", "Napoli", "Palermo"];
const LEVELS_READY = 0; // set by the topic pack in the Content phase

export function Home({ user, players, inviteCode }: { user: CurrentUser; players: Player[]; inviteCode: string | null }) {
  const me = players.find((p) => p.id === user.id) ?? { ...user, stars: 0, stop: 0 };
  const rivals = players.filter((p) => p.id !== user.id);
  const current = Math.min(me.stop, ROUTE.length - 1);

  return (
    <>
      <header className="mx-auto flex w-full max-w-[640px] items-center gap-2 px-4 pt-5">
        <Wordmark size="sm" />
        <Link href="/profile" className="ml-auto rounded-full" aria-label="Il tuo profilo (your profile)">
          <Avatar name={user.name} url={user.avatarUrl} size={44} />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-4 px-4 py-5">
        <h1 className="font-display text-4xl">Ciao, {user.name}!</h1>

        <Duel me={me} rivals={rivals} inviteCode={inviteCode} />

        <section aria-labelledby="route-title" className="ticket p-5">
          <h2 id="route-title" className="font-display text-2xl">
            Passato prossimo
          </h2>
          <p className="text-[var(--muted)]">Da Torino a Palermo — each stop teaches one rule.</p>

          <ol className="mt-4 flex flex-col">
            {ROUTE.map((city, i) => {
              const done = i < current;
              const here = i === current;
              const locked = i > current;
              // You render last, so your token sits on top.
              const tokens = players
                .filter((p) => Math.min(p.stop, ROUTE.length - 1) === i)
                .sort((a, b) => Number(a.id === user.id) - Number(b.id === user.id));
              return (
                <li key={city} className="relative flex min-h-16 items-center gap-4">
                  {i < ROUTE.length - 1 && (
                    <span
                      aria-hidden
                      className={`absolute left-[21px] top-[46px] h-[calc(100%-26px)] border-l-[4px] ${
                        done ? "border-solid border-[var(--edge)]" : "border-dotted border-[var(--locked)]"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] font-display text-lg ${
                      here
                        ? "border-[var(--edge)] bg-[var(--tomato-ink)] text-white"
                        : done
                          ? "border-[var(--edge)] bg-[var(--basil)] text-white"
                          : "border-[var(--locked)] bg-[var(--surface)] text-[var(--locked)]"
                    }`}
                  >
                    {locked ? <Lock /> : i + 1}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className={`text-lg font-bold ${locked ? "text-[var(--locked)]" : ""}`}>
                      {city}
                      {locked && <span className="sr-only">, bloccata (locked)</span>}
                    </span>
                    {!locked && (
                      <span className="flex gap-0.5" aria-label="0 stelle su 3">
                        <Star /> <Star /> <Star />
                      </span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {tokens.length > 0 && (
                      <span className="flex -space-x-3">
                        <span className="sr-only">
                          Qui: {tokens.map((p) => (p.id === user.id ? "tu" : p.name)).join(", ")}
                        </span>
                        {tokens.slice(-2).map((p) => (
                          <span
                            key={p.id}
                            aria-hidden
                            className={`rounded-full ${p.id === user.id ? "relative z-10 ring-[3px] ring-[var(--brand)]" : ""}`}
                          >
                            <Avatar name={p.name} url={p.avatarUrl} size={32} />
                          </span>
                        ))}
                        {tokens.length > 2 && (
                          <span aria-hidden className="relative z-20 flex h-8 min-w-8 items-center justify-center rounded-full border-[3px] border-[var(--edge)] bg-[var(--surface)] px-1 text-xs font-extrabold">
                            +{tokens.length - 2}
                          </span>
                        )}
                      </span>
                    )}
                    {here &&
                      (i < LEVELS_READY ? (
                        <button className="btn btn-primary !w-auto !px-5 !py-2">Gioca</button>
                      ) : (
                        <span className="stamp">In arrivo</span>
                      ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </>
  );
}

function Duel({
  me,
  rivals,
  inviteCode,
}: {
  me: Player | (CurrentUser & { stars: number });
  rivals: Player[];
  inviteCode: string | null;
}) {
  if (rivals.length === 0) return <Invite inviteCode={inviteCode} />;

  const all = [me, ...rivals].sort((a, b) => b.stars - a.stars);
  const tied = all[0].stars === all[1].stars;
  const verdict = tied ? "Pari!" : all[0].id === me.id ? "Sei avanti tu!" : `${all[0].name} è avanti`;

  const seat = (p: typeof me) => (
    <li key={p.id} className="flex flex-col items-center gap-1">
      <span className={`rounded-full ${p.id === me.id ? "ring-[3px] ring-[var(--brand)] ring-offset-2 ring-offset-[var(--surface)]" : ""}`}>
        <Avatar name={p.name} url={p.avatarUrl} size={40} />
      </span>
      <span className="max-w-20 truncate text-xs font-bold">{p.id === me.id ? "Tu" : p.name}</span>
      <span className="flex items-center gap-0.5 font-extrabold">
        <Star filled /> {p.stars}
      </span>
    </li>
  );

  return (
    <section aria-label="Chi è avanti? (who's ahead)" className="ticket flex items-center gap-4 px-4 py-3">
      <p className="font-display text-xl leading-tight">{verdict}</p>
      {rivals.length === 1 ? (
        // Two players: a face-off — you on the left, your rival on the right.
        <ul className="ml-auto flex items-center gap-3">
          {seat(me)}
          <li aria-hidden className="font-display text-lg text-[var(--muted)]">
            vs
          </li>
          {seat(rivals[0])}
        </ul>
      ) : (
        <ul className="ml-auto flex flex-wrap justify-end gap-3">{all.map(seat)}</ul>
      )}
    </section>
  );
}

function Invite({ inviteCode }: { inviteCode: string | null }) {
  const [status, setStatus] = useState<string | null>(null);
  async function share() {
    const url = window.location.origin;
    const text = inviteCode
      ? `Sfidami a Ho imparato! Invite code: ${inviteCode}`
      : "Sfidami a Ho imparato!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ho imparato", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      sfx.pop();
      setStatus("Copiato! Paste it to your study partner.");
    } catch {
      /* share sheet dismissed */
    }
  }
  return (
    <section className="ticket flex flex-col gap-3 p-4">
      <h2 className="font-display text-xl">Nessun rivale… ancora</h2>
      <p className="text-[var(--muted)]">Invite your study partner. Whoever has more stars is ahead.</p>
      <button className="btn btn-tomato" onClick={share}>
        Sfida qualcuno
      </button>
      <p aria-live="polite" className="font-semibold text-[var(--success)]">
        {status}
      </p>
    </section>
  );
}

function Star({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className={filled ? "text-[var(--lemon-deep)]" : "text-[var(--locked)]"}>
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "var(--edge)" : "currentColor"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Lock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
