"use client";

import { useState } from "react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import type { Player } from "@/lib/board";
import { sfx } from "@/lib/sfx";
import { isUnlocked } from "@/lib/unlock";
import { TOPICS } from "@/topics";
import { Avatar } from "./Avatar";
import { Wordmark } from "./Wordmark";

/*
  Copy rule: game words in Italian (Tu, Gioca, Pari, Mappa, In arrivo),
  English only as a secondary gloss for anything instructional.
*/

export function Home({
  user,
  players,
  myStars,
  topicId,
  inviteCode,
  review,
  weekly,
}: {
  user: CurrentUser;
  players: Player[];
  myStars: Record<string, number>;
  topicId: string;
  inviteCode: string | null;
  review: { due: number; remembered: number };
  weekly: { played: boolean; xp: number; resetsAt: string };
}) {
  const topic = TOPICS[topicId];
  const levels = topic.levels;
  const me = players.find((p) => p.id === user.id) ?? { ...user, stars: 0, points: 0, stop: 0 };
  const rivals = players.filter((p) => p.id !== user.id);
  // Your stop = the first level you haven't cleared yet (or the last one).
  const firstUncleared = levels.findIndex((l) => !(myStars[l.id] > 0));
  const current = firstUncleared === -1 ? levels.length - 1 : firstUncleared;

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

        <Today review={review} weekly={weekly} anyCleared={Object.values(myStars).some((n) => n > 0)} />

        <section aria-labelledby="route-title" className="ticket p-5">
          <h2 id="route-title" className="font-display text-2xl">
            Passato prossimo
          </h2>
          <p className="text-[var(--muted)]">
            Da {levels[0].stop} a {levels[levels.length - 1].stop}. Each stop teaches one rule.
          </p>

          <ol className="mt-4 flex flex-col">
            {levels.map((level, i) => {
              const city = level.stop;
              const stars = myStars[level.id] ?? 0;
              const done = stars > 0;
              const locked = !isUnlocked(topic, i, myStars);
              const here = i === current && !locked;
              // You render last, so your token sits on top.
              const tokens = players
                .filter((p) => Math.min(p.stop, levels.length - 1) === i)
                .sort((a, b) => Number(a.id === user.id) - Number(b.id === user.id));
              return (
                <li key={city} className="relative flex min-h-16 items-center gap-4">
                  {i < levels.length - 1 && (
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
                  <Link
                    href={locked ? "#" : `/play/${topic.id}/${level.id}`}
                    aria-disabled={locked}
                    tabIndex={locked ? -1 : undefined}
                    onClick={(e) => locked && e.preventDefault()}
                    className={`flex min-w-0 flex-col py-1 ${locked ? "pointer-events-none" : ""}`}
                  >
                    <span className={`text-lg font-bold leading-tight ${locked ? "text-[var(--locked)]" : ""}`}>
                      {city}
                      {locked && <span className="sr-only">, bloccata (locked)</span>}
                    </span>
                    <span className={`truncate text-sm ${locked ? "text-[var(--locked)]" : "text-[var(--muted)]"}`}>{level.gloss}</span>
                    {!locked && (
                      <span className="flex gap-0.5" aria-label={`${stars} stelle su 3`}>
                        {[0, 1, 2].map((k) => (
                          <Star key={k} filled={k < stars} />
                        ))}
                      </span>
                    )}
                  </Link>
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
                    {here && (
                      <Link href={`/play/${topic.id}/${level.id}`} className="btn btn-primary !w-auto !px-5 !py-2" onClick={() => sfx.pop()}>
                        Gioca
                      </Link>
                    )}
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
  me: Player | (CurrentUser & { stars: number; points: number });
  rivals: Player[];
  inviteCode: string | null;
}) {
  if (rivals.length === 0) return <Invite inviteCode={inviteCode} />;

  const all = [me, ...rivals].sort((a, b) => b.stars - a.stars);
  // Stars decide who's ahead; points break a tie.
  all.sort((a, b) => b.stars - a.stars || b.points - a.points);
  const tied = all[0].stars === all[1].stars && all[0].points === all[1].points;
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
      <span className="text-xs font-bold text-[var(--muted)]">{"points" in p ? p.points : 0} pt</span>
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

function daysUntil(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d <= 1 ? "domani" : `tra ${d} giorni`;
}

/** Today's extras: the Ripasso deck and the weekly challenge. */
function Today({
  review,
  weekly,
  anyCleared,
}: {
  review: { due: number; remembered: number };
  weekly: { played: boolean; xp: number; resetsAt: string };
  anyCleared: boolean;
}) {
  if (!anyCleared && review.due === 0) return null; // nothing to review before the first stop
  const urgent = review.due >= 5;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/ripasso"
        className={`ticket flex flex-col gap-1 p-4 ${urgent ? "!bg-[var(--brand)] !text-[var(--brand-fg)]" : ""}`}
        aria-label={`Ripasso: ${review.due} da ripassare`}
      >
        <span className="font-display text-xl">Ripasso</span>
        <span className="text-3xl font-extrabold leading-none">{review.due}</span>
        <span className={`text-sm ${urgent ? "" : "text-[var(--muted)]"}`}>
          {review.due === 0 ? "all done for now" : "to review"}
          {review.remembered > 0 && ` · ${review.remembered} ricordati`}
        </span>
      </Link>
      <Link href="/sfida" className="ticket flex flex-col gap-1 p-4" aria-label="La sfida della settimana">
        <span className="font-display text-xl leading-tight">Sfida della settimana</span>
        {weekly.played ? (
          <span className="text-sm font-bold text-[var(--success)]">Fatta! +{weekly.xp} punti</span>
        ) : (
          <span className="stamp self-start !text-xs">×2 punti</span>
        )}
        <span className="text-sm text-[var(--muted)]">New one {daysUntil(weekly.resetsAt)}</span>
      </Link>
    </div>
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
