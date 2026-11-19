"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig, useAnimationControls } from "motion/react";
import { findLevel } from "@/topics";
import type { Question } from "@/topics/types";
import { BASE_POINTS, BOSS_SECONDS, HEARTS, checkTyped, multiplier, starsFor, type Verdict } from "@/lib/game";
import { sfx, speak, starSound } from "@/lib/sfx";
import { api } from "@/lib/api";

type Phase = "intro" | "play" | "done";
type Feedback = { verdict: Verdict; question: Question; given: string; points: number };
type Result = { stars: number; best: number; newBest: boolean; unlockedNext: boolean };

const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

/** The full Italian sentence with the gap filled, for speech and the feedback card. */
function solved(q: Question): string | null {
  if (q.kind === "tiles") return q.answer.join(" ");
  if (q.id.startsWith("aux-")) return null;
  if (q.prompt.startsWith("Participio")) return q.answer;
  if (!q.prompt.includes("___")) return null;
  return q.prompt
    .replace("___", q.answer)
    .replace(/\s*\([^)]*\)/g, "") // drop "(noi, guardare)" clues and "Io (Sara)" hints
    .replace(/^(.+?) → /, "$1, ") // "parlare → parlato" reads as "parlare, parlato"
    .trim();
}

export function Round({ topicId, levelId }: { topicId: string; levelId: string }) {
  const found = findLevel(topicId, levelId)!;
  const { level, topic, index } = found;
  const next = topic.levels[index + 1];

  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [i, setI] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(BOSS_SECONDS);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const shake = useAnimationControls();
  const saving = useRef(false);

  const q = questions[i];
  const mult = multiplier(streak);

  function start() {
    const pool = shuffle(level.build());
    const round = pool.slice(0, level.questionsPerRound).map((x) =>
      x.kind === "tiles" ? { ...x, tiles: shuffle(x.tiles) } : x.kind === "choice" && x.options.length > 2 ? { ...x, options: shuffle(x.options) } : x,
    );
    setQuestions(round);
    setI(0);
    setHearts(HEARTS);
    setStreak(0);
    setScore(0);
    setCorrect(0);
    setMissed([]);
    setFeedback(null);
    setSecondsLeft(BOSS_SECONDS);
    setResult(null);
    setSaveError(null);
    saving.current = false;
    setPhase("play");
    sfx.pop();
  }

  const end = useCallback((completed: boolean) => {
    setFinished(completed);
    setPhase("done");
  }, []);

  // Boss timer
  useEffect(() => {
    if (!level.timed || phase !== "play" || feedback) return;
    const t = setTimeout(() => {
      if (secondsLeft <= 1) {
        sfx.nope();
        end(false);
        return;
      }
      setSecondsLeft(secondsLeft - 1);
      if (secondsLeft <= 11) sfx.tick();
    }, 1000);
    return () => clearTimeout(t);
  }, [level.timed, phase, feedback, secondsLeft, end]);

  function answer(given: string, verdict: Verdict) {
    if (!q || feedback) return;
    const ok = verdict !== "wrong";
    let points = 0;
    if (ok) {
      points = Math.round(BASE_POINTS * mult);
      setScore((s) => s + points);
      setStreak((s) => s + 1);
      setCorrect((c) => c + 1);
      sfx.bravo();
      const line = solved(q);
      if (line) speak(line);
    } else {
      setStreak(0);
      setHearts((h) => h - 1);
      setMissed((m) => [...m, q.id]);
      sfx.nope();
      void shake.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.35 } });
    }
    setFeedback({ verdict, question: q, given, points });
  }

  function advance() {
    if (!feedback) return;
    setFeedback(null);
    if (hearts <= 0) return end(false);
    if (i + 1 >= questions.length) return end(true);
    setI((n) => n + 1);
  }

  // Save the round once it ends.
  const stars = starsFor(hearts, finished);
  useEffect(() => {
    if (phase !== "done" || saving.current) return;
    saving.current = true;
    api<Result>("/api/progress", {
      topic: topic.id,
      level: level.id,
      correct,
      total: i + 1,
      hearts,
      finished,
      score,
      missed,
    })
      .then(setResult)
      .catch((e) => setSaveError((e as Error).message));
  }, [phase, topic.id, level.id, correct, i, hearts, finished, score, missed]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 py-4">
        <header className="flex items-center gap-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-[var(--edge)] bg-[var(--surface)]" aria-label="Torna alla mappa (back to the map)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
          {phase === "play" ? (
            <>
              <div className="h-4 flex-1 overflow-hidden rounded-full border-[3px] border-[var(--edge)] bg-[var(--surface)]" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={i} aria-label="Avanzamento">
                <motion.div className="h-full bg-[var(--basil)]" animate={{ width: `${(i / questions.length) * 100}%` }} />
              </div>
              <Hearts n={hearts} />
            </>
          ) : (
            <p className="font-display text-xl">{level.stop}</p>
          )}
        </header>

        {phase === "play" && (
          <div className="mt-3 flex items-center justify-between text-sm font-extrabold">
            <span aria-live="polite">{score} punti</span>
            {streak >= 3 && (
              <motion.span key={mult} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="rounded-full bg-[var(--tomato-ink)] px-2.5 py-0.5 text-white">
                ×{mult} serie da {streak}
              </motion.span>
            )}
            {level.timed && <span className={secondsLeft <= 10 ? "text-[var(--danger)]" : ""}>⏱ {secondsLeft}s</span>}
          </div>
        )}

        {phase === "intro" && (
          <section className="ticket mt-6 flex flex-col gap-4 p-6">
            <p className="text-[var(--muted)]">
              Fermata {index + 1} · {level.gloss}
            </p>
            <h1 className="font-display text-3xl leading-tight">{level.title}</h1>
            <ul className="flex flex-col gap-2">
              {level.intro.map((line) => (
                <li key={line} className="rounded-xl border-[2.5px] border-[var(--edge)] px-3 py-2 font-semibold">
                  {line}
                </li>
              ))}
            </ul>
            <p className="text-sm text-[var(--muted)]">
              {level.questionsPerRound} questions · {HEARTS} hearts{level.timed ? ` · ${BOSS_SECONDS} seconds` : ""}. Stars = hearts left at the end.
            </p>
            <button className="btn btn-primary" onClick={start} autoFocus>
              Inizia
            </button>
          </section>
        )}

        {phase === "play" && q && (
          <motion.section animate={shake} className="mt-5 flex flex-1 flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div key={q.id + i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.18 }} className="flex flex-col gap-4">
                <QuestionCard q={q} />
                {q.kind === "choice" && <Choices q={q} locked={!!feedback} onAnswer={(o) => answer(o, o === q.answer ? "right" : "wrong")} />}
                {q.kind === "type" && <Typed q={q} locked={!!feedback} onAnswer={(t) => answer(t, checkTyped(t, [q.answer, ...(q.accept ?? [])]))} />}
                {q.kind === "tiles" && <Tiles q={q} locked={!!feedback} onAnswer={(words) => answer(words.join(" "), words.join(" ") === q.answer.join(" ") ? "right" : "wrong")} />}
              </motion.div>
            </AnimatePresence>
          </motion.section>
        )}

        {phase === "done" && (
          <Results
            stars={stars}
            finished={finished}
            score={score}
            correct={correct}
            answered={i + 1}
            result={result}
            saveError={saveError}
            nextStop={next?.stop}
            timed={level.timed}
            onRetry={start}
          />
        )}
      </main>

      <AnimatePresence>{feedback && <FeedbackSheet f={feedback} onNext={advance} last={hearts <= 0 || i + 1 >= questions.length} />}</AnimatePresence>
    </MotionConfig>
  );
}

// ── pieces ──────────────────────────────────────────────────────────────

function Hearts({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} cuori su ${HEARTS}`}>
      {Array.from({ length: HEARTS }, (_, k) => (
        <motion.svg key={k} width="24" height="24" viewBox="0 0 24 24" animate={k >= n ? { scale: [1.4, 1] } : {}} aria-hidden>
          <path
            d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.3 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.7 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z"
            fill={k < n ? "var(--tomato-ink)" : "none"}
            stroke="var(--edge)"
            strokeWidth="2.5"
          />
        </motion.svg>
      ))}
    </span>
  );
}

function QuestionCard({ q }: { q: Question }) {
  const isAux = q.id.startsWith("aux-");
  return (
    <div className="ticket flex flex-col gap-2 p-5">
      <p className="text-sm font-bold text-[var(--muted)]">
        {q.kind === "tiles" ? "Build the sentence" : isAux ? "Avere o essere?" : q.kind === "type" ? "Write the missing words" : "Choose"}
      </p>
      <p className={`font-extrabold leading-snug ${isAux ? "font-display text-5xl" : "text-2xl"}`}>{q.prompt}</p>
      {"hint" in q && q.hint && <p className="text-[var(--muted)]">{q.hint}</p>}
    </div>
  );
}

function Choices({ q, locked, onAnswer }: { q: Extract<Question, { kind: "choice" }>; locked: boolean; onAnswer: (o: string) => void }) {
  const two = q.options.length === 2;
  // Number keys 1–4 pick an option.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!locked && n >= 1 && n <= q.options.length) onAnswer(q.options[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q.options, locked, onAnswer]);

  return (
    <div className={`grid gap-3 ${two ? "grid-cols-2" : "grid-cols-1"}`}>
      {q.options.map((o) => (
        <motion.button
          key={o}
          whileTap={{ scale: 0.96 }}
          disabled={locked}
          onClick={() => onAnswer(o)}
          className={`btn ${two ? (o === "essere" ? "btn-primary" : "btn-tomato") + " !py-6 text-2xl" : "btn-secondary justify-start text-left"}`}
        >
          {o}
        </motion.button>
      ))}
    </div>
  );
}

function Typed({ locked, onAnswer }: { q: Extract<Question, { kind: "type" }>; locked: boolean; onAnswer: (t: string) => void }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !locked) onAnswer(value);
      }}
      className="flex flex-col gap-3"
    >
      <input
        ref={ref}
        className="field text-xl"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={locked}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        lang="it"
        aria-label="La tua risposta (your answer)"
        placeholder="…"
      />
      <AccentKeys onKey={(k) => (setValue((v) => v + k), ref.current?.focus())} />
      <button className="btn btn-primary" disabled={locked || !value.trim()}>
        Controlla
      </button>
    </form>
  );
}

function AccentKeys({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="flex gap-2" aria-label="Accented letters">
      {["à", "è", "é", "ì", "ò", "ù"].map((k) => (
        <button key={k} type="button" onClick={() => onKey(k)} className="h-11 flex-1 rounded-xl border-[2.5px] border-[var(--edge)] bg-[var(--surface)] text-lg font-bold">
          {k}
        </button>
      ))}
    </div>
  );
}

function Tiles({ q, locked, onAnswer }: { q: Extract<Question, { kind: "tiles" }>; locked: boolean; onAnswer: (words: string[]) => void }) {
  // Track by index so duplicate words work.
  const [picked, setPicked] = useState<number[]>([]);
  const words = picked.map((k) => q.tiles[k]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-16 flex-wrap items-center gap-2 rounded-xl border-[2.5px] border-dashed border-[var(--edge)] p-3" aria-live="polite">
        {picked.length === 0 && <span className="text-[var(--muted)]">Tap the words in order</span>}
        {picked.map((k) => (
          <motion.button layoutId={`tile-${k}`} key={k} disabled={locked} onClick={() => setPicked((p) => p.filter((x) => x !== k))} className="rounded-lg border-[2.5px] border-[var(--edge)] bg-[var(--lemon)] px-3 py-1.5 text-lg font-bold text-[var(--ink)]">
            {q.tiles[k]}
          </motion.button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {q.tiles.map((w, k) =>
          picked.includes(k) ? (
            <span key={k} className="rounded-lg border-[2.5px] border-dashed border-[var(--locked)] px-3 py-1.5 text-lg font-bold text-transparent" aria-hidden>
              {w}
            </span>
          ) : (
            <motion.button layoutId={`tile-${k}`} key={k} disabled={locked} onClick={() => (sfx.pop(), setPicked((p) => [...p, k]))} className="rounded-lg border-[2.5px] border-[var(--edge)] bg-[var(--surface)] px-3 py-1.5 text-lg font-bold">
              {w}
            </motion.button>
          ),
        )}
      </div>
      <button className="btn btn-primary" disabled={locked || picked.length === 0} onClick={() => onAnswer(words)}>
        Controlla
      </button>
    </div>
  );
}

function FeedbackSheet({ f, onNext, last }: { f: Feedback; onNext: () => void; last: boolean }) {
  const ok = f.verdict !== "wrong";
  const right = f.question.kind === "tiles" ? f.question.answer.join(" ") : f.question.answer;
  const sentence = solved(f.question);
  const btn = useRef<HTMLButtonElement>(null);
  // One tap only: the sheet stays on screen while it slides away, and a double-tap would skip a question.
  const [used, setUsed] = useState(false);
  useEffect(() => {
    btn.current?.focus();
  }, []);
  return (
    <motion.aside
      role="status"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={`fixed inset-x-0 bottom-0 z-50 border-t-[3px] border-[var(--edge)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 ${ok ? "bg-[#d9f2e2] text-[#0f3d22]" : "bg-[#fde0da] text-[#5c1409]"}`}
    >
      <div className="mx-auto flex max-w-[560px] flex-col gap-2">
        <p className="font-display text-2xl">
          {ok ? (f.verdict === "accent" ? "Giusto, ma attenzione all'accento!" : "Giusto!") : "Non proprio…"}
          {ok && f.points > 0 && <span className="ml-2 font-sans text-lg font-extrabold">+{f.points}</span>}
        </p>
        {(!ok || f.verdict === "accent") && (
          <p className="text-lg">
            Risposta: <strong>{right}</strong>
          </p>
        )}
        {sentence && sentence !== right && (
          <button type="button" onClick={() => speak(sentence)} className="self-start text-left font-semibold underline underline-offset-4">
            🔊 {sentence}
          </button>
        )}
        <p>{f.question.explain}</p>
        <button
          ref={btn}
          disabled={used}
          className={`btn mt-1 ${ok ? "!bg-[#1f8a4c] !text-white" : "!bg-[#c8321f] !text-white"}`}
          onClick={() => {
            if (used) return;
            setUsed(true);
            onNext();
          }}
        >
          {last ? "Vedi il risultato" : "Avanti"}
        </button>
      </div>
    </motion.aside>
  );
}

function Results({
  stars,
  finished,
  score,
  correct,
  answered,
  result,
  saveError,
  nextStop,
  timed,
  onRetry,
}: {
  timed?: boolean;
  stars: number;
  finished: boolean;
  score: number;
  correct: number;
  answered: number;
  result: Result | null;
  saveError: string | null;
  nextStop?: string;
  onRetry: () => void;
}) {
  useEffect(() => {
    if (!finished) return;
    const timers = Array.from({ length: stars }, (_, k) => setTimeout(() => starSound(k), 450 + k * 380));
    if (stars === 3) timers.push(setTimeout(() => sfx.bravo(), 450 + 3 * 380));
    return () => timers.forEach(clearTimeout);
  }, [finished, stars]);

  const headline = !finished ? "Peccato!" : stars === 3 ? "Perfetto!" : stars === 2 ? "Bravo!" : "Ce l'hai fatta!";
  return (
    <section className="ticket mt-6 flex flex-col items-center gap-4 p-6 text-center">
      <h1 className="font-display text-4xl">{headline}</h1>
      <div className="flex gap-3" aria-label={`${stars} stelle su 3`}>
        {[0, 1, 2].map((k) => (
          <motion.svg
            key={k}
            width="64"
            height="64"
            viewBox="0 0 24 24"
            initial={k < stars ? { scale: 2.4, rotate: -30, opacity: 0 } : false}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.45 + k * 0.38, type: "spring", stiffness: 300, damping: 12 }}
            aria-hidden
          >
            <path
              d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
              fill={k < stars ? "var(--lemon-deep)" : "none"}
              stroke={k < stars ? "var(--edge)" : "var(--locked)"}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </motion.svg>
        ))}
      </div>
      <p className="text-lg font-bold">
        {score} punti · {correct}/{answered} giuste
      </p>
      {!finished && <p className="text-[var(--muted)]">Out of hearts{timed ? " or time" : ""}. Every round makes it stick — try again.</p>}
      {result?.newBest && <span className="stamp">Record!</span>}
      {result?.unlockedNext && nextStop && <p className="font-bold text-[var(--success)]">Hai sbloccato {nextStop}!</p>}
      {saveError && (
        <p role="alert" className="error">
          Couldn&apos;t save this round: {saveError}
        </p>
      )}
      <div className="flex w-full flex-col gap-2">
        <button className="btn btn-primary" onClick={onRetry}>
          {finished && stars === 3 ? "Gioca ancora" : "Riprova"}
        </button>
        <Link href="/" className="btn btn-secondary">
          Torna alla mappa
        </Link>
      </div>
    </section>
  );
}
