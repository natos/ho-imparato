"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";
import type { Player } from "@/lib/board";
import { sfx } from "@/lib/sfx";
import { isUnlocked } from "@/lib/unlock";
import { TOPICS } from "@/topics";
import type { Level } from "@/topics/types";
import { Avatar } from "./Avatar";
import { Wordmark } from "./Wordmark";
import { FeedbackIdentify, FeedbackLink } from "./Feedback";

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
  const me = players.find((p) => p.id === user.id) ?? { ...user, stars: 0, points: 0, weekPoints: 0, stop: 0 };
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
        <FeedbackIdentify id={user.id} name={user.name} />

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
                    {tokens.length > 0 && <StopTokens tokens={tokens} meId={user.id} />}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        <FeedbackLink className="self-center text-[var(--muted)]" />
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
  me: Me;
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
      <li>{rivals.length ? <Classifica me={me} rivals={rivals} /> : <Invite inviteCode={inviteCode} />}</li>
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

type Me = Player | (CurrentUser & { stars: number; points: number; weekPoints: number });
type Board = "week" | "all";

// Remember which board you last looked at (per device; falls back to the week).
const BOARD_KEY = "classifica-board";
const boardListeners = new Set<() => void>();
function readBoard(): Board {
  try {
    return localStorage.getItem(BOARD_KEY) === "all" ? "all" : "week";
  } catch {
    return "week";
  }
}
function writeBoard(b: Board) {
  try {
    localStorage.setItem(BOARD_KEY, b);
  } catch {
    /* fine */
  }
  boardListeners.forEach((f) => f());
}
const subscribeBoard = (f: () => void) => (boardListeners.add(f), () => boardListeners.delete(f));

/**
 * The class leaderboard. Collapsed: your rank in one line. Open: top 5, plus you if you're further down.
 * "Settimana" ranks by points since Monday, so a newcomer can top it; "Sempre" by stars, then points.
 */
function Classifica({ me, rivals }: { me: Me; rivals: Player[] }) {
  const [open, setOpen] = useState(false);
  const board = useSyncExternalStore(subscribeBoard, readBoard, () => "week" as Board);
  const score = (p: Me) => (board === "week" ? p.weekPoints : p.points);
  const all = [me, ...rivals].sort((a, b) =>
    board === "week" ? b.weekPoints - a.weekPoints || b.stars - a.stars : b.stars - a.stars || b.points - a.points,
  );
  // Equal scores share a rank (1, 2, 2, 4…).
  const same = (a: Me, b: Me) => (board === "week" ? a.weekPoints === b.weekPoints : a.stars === b.stars && a.points === b.points);
  const ranks = all.map((p) => all.findIndex((q) => same(p, q)));
  const mine = all.findIndex((p) => p.id === me.id);
  const myRank = ranks[mine] + 1;
  const quiet = board === "week" && all.every((p) => p.weekPoints === 0);
  const tiedTop = all.length > 1 && same(all[0], all[1]);
  const verdict = quiet
    ? "Settimana nuova: tutti a zero"
    : myRank === 1
      ? tiedTop
        ? "Pari in testa!"
        : "Sei in testa!"
      : `Sei ${myRank}° su ${all.length}`;
  const top = all.slice(0, 5);
  const showMe = mine >= 5;

  return (
    <div>
      <button type="button" className={`${row} w-full text-left`} aria-expanded={open} aria-controls="classifica" onClick={() => setOpen((o) => !o)}>
        <span className="flex -space-x-2" aria-hidden>
          {all.slice(0, 3).map((p) => (
            <span key={p.id} className={`rounded-full ${p.id === me.id ? "relative z-10 ring-[3px] ring-[var(--brand)]" : ""}`}>
              <Avatar name={p.name} url={p.avatarUrl} size={32} />
            </span>
          ))}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-bold">{verdict}</span>
          <span className="text-sm text-[var(--muted)]">Classifica · {board === "week" ? "questa settimana" : "sempre"}</span>
        </span>
        <svg
          className={`ml-auto shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-90" : ""}`}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {open && (
        <div id="classifica" className="flex flex-col gap-2 px-4 pb-3" data-sentioo-mask>
          <div className="flex gap-2" role="radiogroup" aria-label="Classifica">
            {(["week", "all"] as const).map((b) => (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={board === b}
                onClick={() => writeBoard(b)}
                className={`rounded-full border-[2.5px] px-3 py-1 text-sm font-bold ${
                  board === b ? "border-[var(--edge)] bg-[var(--brand)] text-[var(--brand-fg)]" : "border-[var(--locked)] text-[var(--muted)]"
                }`}
              >
                {b === "week" ? "Settimana" : "Sempre"}
              </button>
            ))}
          </div>
          <ol className="flex flex-col">
            {top.map((p, k) => (
              <Place key={p.id} p={p} rank={ranks[k] + 1} isMe={p.id === me.id} stars={board === "all"} value={score(p)} />
            ))}
            {showMe && (
              <>
                {mine > 5 && (
                  <li aria-hidden className="py-0.5 pl-2 text-[var(--muted)]">
                    ⋮
                  </li>
                )}
                <Place p={me} rank={myRank} isMe stars={board === "all"} value={score(me)} />
              </>
            )}
          </ol>
        </div>
      )}
    </div>
  );
}

function Place({ p, rank, isMe, stars, value }: { p: Me; rank: number; isMe: boolean; stars: boolean; value: number }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${isMe ? "bg-[color-mix(in_srgb,var(--brand)_15%,transparent)] font-bold" : ""}`}>
      <span className="w-7 text-right font-extrabold tabular-nums">{rank}°</span>
      <Avatar name={p.name} url={p.avatarUrl} size={28} />
      <span className="min-w-0 flex-1 truncate">{isMe ? "Tu" : p.name}</span>
      {stars && (
        <span className="flex items-center gap-0.5 text-sm font-extrabold">
          <Star filled /> {p.stars}
        </span>
      )}
      <span className="w-16 text-right text-sm font-extrabold tabular-nums">{value} pt</span>
    </li>
  );
}

/** On the map: your own token, and a count of everyone else at that stop. */
function StopTokens({ tokens, meId }: { tokens: Player[]; meId: string }) {
  const me = tokens.find((p) => p.id === meId);
  const others = tokens.length - (me ? 1 : 0);
  return (
    <span className="flex items-center -space-x-2">
      <span className="sr-only">
        {me ? "Tu sei qui" : ""}
        {me && others ? " e " : ""}
        {others ? `${others} ${others === 1 ? "altro" : "altri"}` : ""}
      </span>
      {me && (
        <span aria-hidden className="relative z-10 rounded-full ring-[3px] ring-[var(--brand)]">
          <Avatar name={me.name} url={me.avatarUrl} size={32} />
        </span>
      )}
      {others > 0 && (
        <span aria-hidden className="flex h-8 min-w-8 items-center justify-center rounded-full border-[3px] border-[var(--edge)] bg-[var(--surface)] px-1 text-xs font-extrabold">
          {me ? `+${others}` : others}
        </span>
      )}
    </span>
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
