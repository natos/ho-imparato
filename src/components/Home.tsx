"use client";

import { useState } from "react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import type { Player } from "@/lib/board";
import { sfx } from "@/lib/sfx";
import { isUnlocked } from "@/lib/unlock";
import { TOPICS } from "@/topics";
import type { Level } from "@/topics/types";
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
        <h1 className="sr-only">Ciao, {user.name}!</h1>

        <Next
          topicId={topic.id}
          level={levels[current]}
          index={current}
          total={levels.length}
          stars={myStars[levels[current].id] ?? 0}
          reviewDue={review.due}
        />

        <Rows
          me={me}
          rivals={rivals}
          inviteCode={inviteCode}
          review={review}
          weekly={weekly}
          anyCleared={Object.values(myStars).some((n) => n > 0)}
        />

        <section aria-labelledby="route-title" className="ticket p-5">
          <h2 id="route-title" className="font-display text-2xl">
            La mappa
          </h2>

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

/**
 * The one obvious move. Your next stop, or Ripasso when 5+ skills are waiting
 * (spaced review only works if you come back on time).
 */
function Next({
  topicId,
  level,
  index,
  total,
  stars,
  reviewDue,
}: {
  topicId: string;
  level: Level;
  index: number;
  total: number;
  stars: number;
  reviewDue: number;
}) {
  const href = `/play/${topicId}/${level.id}`;
  if (reviewDue >= 5) {
    return (
      <section className="ticket flex flex-col gap-3 p-5" aria-labelledby="next-title">
        <p className="text-sm font-bold text-[var(--muted)]">Prima, un ripasso</p>
        <h2 id="next-title" className="font-display text-4xl leading-tight">
          {reviewDue} da ripassare
        </h2>
        <p className="text-[var(--muted)]">Things you missed before, back at the right moment.</p>
        <Link href="/ripasso" className="btn btn-primary" onClick={() => sfx.pop()}>
          Ripassa
        </Link>
        <Link href={href} className="self-center font-semibold underline underline-offset-4">
          O gioca {level.stop}
        </Link>
      </section>
    );
  }
  return (
    <section className="ticket flex flex-col gap-3 p-5" aria-labelledby="next-title">
      <p className="text-sm font-bold text-[var(--muted)]">
        Fermata {index + 1} di {total}
      </p>
      <h2 id="next-title" className="font-display text-5xl leading-none">
        {level.stop}
      </h2>
      <p className="text-lg">{level.gloss}</p>
      {stars > 0 && (
        <span className="flex gap-0.5" role="img" aria-label={`${stars} stelle su 3`}>
          {[0, 1, 2].map((k) => (
            <Star key={k} filled={k < stars} />
          ))}
        </span>
      )}
      <Link href={href} className="btn btn-primary mt-1" onClick={() => sfx.pop()}>
        {stars > 0 ? "Gioca ancora" : "Gioca"}
      </Link>
    </section>
  );
}

function daysUntil(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d <= 1 ? "Nuova domani" : `Nuova tra ${d} giorni`;
}

const row = "flex min-h-14 items-center gap-3 px-4 py-2";

/** Everything else, one line each: who's ahead, Ripasso, the weekly challenge. */
function Rows({
  me,
  rivals,
  inviteCode,
  review,
  weekly,
  anyCleared,
}: {
  me: Player | (CurrentUser & { stars: number; points: number });
  rivals: Player[];
  inviteCode: string | null;
  review: { due: number; remembered: number };
  weekly: { played: boolean; xp: number; resetsAt: string };
  anyCleared: boolean;
}) {
  // Ripasso gets a row only when something is due and it isn't already the big ticket.
  const showReview = review.due > 0 && review.due < 5;
  return (
    <ul className="ticket flex flex-col divide-y-[2px] divide-dashed divide-[color-mix(in_srgb,var(--edge)_35%,transparent)] py-1">
      <li>{rivals.length ? <DuelRow me={me} rivals={rivals} /> : <Invite inviteCode={inviteCode} />}</li>
      {showReview && (
        <li>
          <Link href="/ripasso" className={row}>
            <span className="font-bold">Ripasso</span>
            <span className="text-[var(--muted)]">{review.due} da ripassare</span>
            <Chevron />
          </Link>
        </li>
      )}
      {anyCleared && (
        <li>
          <Link href="/sfida" className={row}>
            <span className="font-bold">Sfida della settimana</span>
            {weekly.played ? (
              <span className="font-bold text-[var(--success)]">Fatta ✓ +{weekly.xp}</span>
            ) : (
              <span className="rounded-full bg-[var(--tomato-ink)] px-2 py-0.5 text-xs font-extrabold text-white">×2 punti</span>
            )}
            <span className="ml-auto hidden text-sm text-[var(--muted)] sm:inline">{daysUntil(weekly.resetsAt)}</span>
            <Chevron />
          </Link>
        </li>
      )}
    </ul>
  );
}

function DuelRow({ me, rivals }: { me: Player | (CurrentUser & { stars: number; points: number }); rivals: Player[] }) {
  // Stars decide who's ahead; points break a tie.
  const all = [me, ...rivals].sort((a, b) => b.stars - a.stars || b.points - a.points);
  const tied = all[0].stars === all[1].stars && all[0].points === all[1].points;
  const verdict = tied ? "Pari!" : all[0].id === me.id ? "Sei avanti tu!" : `${all[0].name} è avanti`;
  // Two players: you vs them. More: you vs whoever leads (or the runner-up if that's you).
  const rival = all.find((p) => p.id !== me.id)!;
  return (
    <div className={row} aria-label={`${verdict} Tu ${me.stars} stelle, ${rival.name} ${rival.stars} stelle`}>
      <span className="flex -space-x-2" aria-hidden>
        <span className="rounded-full ring-[3px] ring-[var(--brand)]">
          <Avatar name={me.name} url={me.avatarUrl} size={32} />
        </span>
        <Avatar name={rival.name} url={rival.avatarUrl} size={32} />
      </span>
      <span className="font-bold">{verdict}</span>
      <span className="ml-auto flex items-center gap-1 text-sm font-extrabold" aria-hidden>
        <Star filled /> {me.stars} <span className="font-semibold text-[var(--muted)]">vs</span> <Star filled /> {rival.stars}
      </span>
    </div>
  );
}

function Chevron() {
  return (
    <svg className="ml-auto shrink-0 text-[var(--muted)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
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
    <div className={`${row} flex-wrap`}>
      <span className="font-bold">Nessun rivale… ancora</span>
      <button className="ml-auto rounded-full border-[3px] border-[var(--edge)] bg-[var(--tomato-ink)] px-4 py-1.5 font-bold text-white" onClick={share}>
        Sfida qualcuno
      </button>
      <p aria-live="polite" className="w-full text-sm font-semibold text-[var(--success)] empty:hidden">
        {status}
      </p>
    </div>
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
