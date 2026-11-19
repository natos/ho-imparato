"use client";

import { useCallback, useEffect, useRef, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig, useAnimationControls } from "motion/react";
import { findLevel } from "@/topics";
import type { Level, Question } from "@/topics/types";
import { BASE_POINTS, HEARTS, MAX_RETRIES, checkTyped, multiplier, secondsFor, starsFor, type Verdict } from "@/lib/game";
import { sfx, speak, starSound } from "@/lib/sfx";
import { api } from "@/lib/api";

type Phase = "intro" | "play" | "done";
/** A question in the round queue. Retries are misses asked again a few questions later. */
type Item = Question & { retry?: boolean };
type Feedback = { verdict: Verdict; question: Item; given: string; points: number; timedOut?: boolean };
type Result = {
  stars?: number;
  best?: number;
  newBest?: boolean;
  unlockedNext?: boolean;
  xp: number;
  mastered?: boolean;
  promoted?: number;
  reset?: number;
  firstAttempt?: boolean;
};
type Mode = "level" | "ripasso" | "sfida";
type AnswerLog = { question: Question; verdict: Verdict; level: string | null };

/** Practice modes (Ripasso, weekly challenge) reuse the round with a fixed set of questions. */
function practiceLevel(mode: Exclude<Mode, "level">, preset: Question[], alreadyPlayed?: boolean): Level {
  return mode === "ripasso"
    ? {
        id: "ripasso",
        stop: "Ripasso",
        title: "Ripasso",
        gloss: "Review what's due today",
        intro: [
          "Questions you missed, and ones you're about to forget.",
          "Right → it comes back later (1 day, 3 days, a week…). Wrong → it comes back in an hour.",
          "No hearts, no timer: 15 points per right answer.",
        ],
        questionsPerRound: preset.length,
        build: () => preset,
      }
    : {
        id: "sfida",
        stop: "Sfida della settimana",
        title: "La sfida della settimana",
        gloss: "This week's challenge",
        intro: [
          "Built from the mistakes you both made most. New every Monday.",
          "Same questions for both of you.",
          alreadyPlayed ? "You've played it: replays are practice, no points." : "First try only: 20 points per right answer.",
        ],
        questionsPerRound: preset.length,
        build: () => preset,
      };
}

const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

/** The full Italian sentence with the gap filled, for speech and the feedback card. */
function solved(q: Question): string | null {
  if (q.kind === "tiles") return q.answer.join(" ");
  if (q.id.startsWith("aux-")) return null;
  if (q.task === "Pick the past participle") return `${q.prompt}, ${q.answer}`;
  if (!q.prompt.includes("___")) return null;
  return q.prompt
    .replace("___", q.answer)
    .replace(/\s*\([^)]*\)/g, "") // drop "(noi, guardare)" clues and "Io (Sara)" hints
    .replace(/^(.+?) → /, "$1, ") // "parlare → parlato" reads as "parlare, parlato"
    .trim();
}

export function Round({
  topicId,
  levelId,
  mode = "level",
  preset,
  week,
  alreadyPlayed,
}: {
  topicId: string;
  levelId?: string;
  mode?: Mode;
  preset?: Question[];
  week?: string;
  alreadyPlayed?: boolean;
}) {
  const practice = mode !== "level";
  const found = practice ? null : findLevel(topicId, levelId!)!;
  const level: Level = found ? found.level : practiceLevel(mode as Exclude<Mode, "level">, preset ?? [], alreadyPlayed);
  const next = found ? found.topic.levels[found.index + 1] : undefined;
  const index = found?.index ?? 0;

  // The intro card shows on your first play of a stop; after that a round starts straight away.
  const [phase, setPhase] = useState<Phase | null>(null);
  const introKey = `intro-seen:${level.id}`;
  const [questions, setQuestions] = useState<Item[]>([]);
  const [i, setI] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [log, setLog] = useState<AnswerLog[]>([]);
  const [answeredOriginals, setAnsweredOriginals] = useState(0);
  const [retriesLeft, setRetriesLeft] = useState(MAX_RETRIES);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const shake = useAnimationControls();
  const saving = useRef(false);
  const [saveTry, setSaveTry] = useState(0);
  function retrySave() {
    saving.current = false;
    setSaveError(null);
    setSaveTry((n) => n + 1);
  }

  const q = questions[i];
  const mult = multiplier(streak);
  // Progress counts original questions only, so a retry never moves the bar backwards.
  const originals = questions.filter((x) => !x.retry).length;
  const done = questions.slice(0, i).filter((x) => !x.retry).length;

  function start() {
    const pool = shuffle(level.build());
    const picked = level.pick ? level.pick(pool, level.questionsPerRound) : pool.slice(0, level.questionsPerRound);
    // Shuffle every option list (so the answer is never "always first"),
    // except avere/essere, which keeps a fixed left/right position on purpose.
    const round = picked.map((x) =>
      x.kind === "tiles" ? { ...x, tiles: shuffle(x.tiles) } : x.kind === "choice" && !x.id.startsWith("aux-") ? { ...x, options: shuffle(x.options) } : x,
    );
    setQuestions(round);
    setI(0);
    setHearts(HEARTS);
    setStreak(0);
    setScore(0);
    setCorrect(0);
    setLog([]);
    setAnsweredOriginals(0);
    setRetriesLeft(MAX_RETRIES);
    setFeedback(null);
    setSecondsLeft(round[0] ? secondsFor(round[0].kind) : 0);
    setResult(null);
    setSaveError(null);
    saving.current = false;
    setPhase("play");
    sfx.pop();
  }

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(introKey) === "1";
    } catch {
      /* storage blocked: show the intro */
    }
    // Reading localStorage (and shuffling) can only happen after mount, so this effect is the right place.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (seen) start();
    else setPhase("intro");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function begin() {
    try {
      localStorage.setItem(introKey, "1");
    } catch {
      /* fine */
    }
    start();
  }

  const end = useCallback((completed: boolean) => {
    setFinished(completed);
    setPhase("done");
  }, []);

  function answer(given: string, verdict: Verdict, timedOut = false) {
    if (!q || feedback) return;
    const ok = verdict !== "wrong";
    let points = 0;
    if (!q.retry) {
      setAnsweredOriginals((n) => n + 1);
      const { retry: _retry, ...plain } = q; // eslint-disable-line @typescript-eslint/no-unused-vars
      setLog((l) => [...l, { question: plain as Question, verdict, level: q.level ?? (practice ? null : level.id) }]);
    }
    if (ok) {
      // A retry is a second chance: half points.
      points = Math.round(BASE_POINTS * mult * (q.retry ? 0.5 : 1));
      setScore((s) => s + points);
      setStreak((s) => s + 1);
      if (!q.retry) setCorrect((c) => c + 1);
      sfx.bravo();
      const line = solved(q);
      if (line) speak(line);
    } else {
      setStreak(0);
      sfx.nope();
      void shake.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.35 } });
      // Hear the right version too, once the buzz is over.
      const line = solved(q);
      if (line) setTimeout(() => speak(line), 600);
      if (!q.retry && !practice) {
        setHearts((h) => h - 1);
        // Ask it again 3 questions later (no heart at stake), up to MAX_RETRIES per round.
        if (retriesLeft > 0) {
          setRetriesLeft((r) => r - 1);
          setQuestions((qs) => {
            const at = Math.min(i + 3, qs.length);
            return [...qs.slice(0, at), { ...q, retry: true }, ...qs.slice(at)];
          });
        }
      }
    }
    setFeedback({ verdict, question: q, given, points, timedOut });
  }

  // Boss: each question has its own countdown; running out counts as a miss.
  useEffect(() => {
    if (!level.timed || phase !== "play" || feedback || !q) return;
    const t = setTimeout(() => {
      if (secondsLeft <= 1) return answer("", "wrong", true);
      setSecondsLeft(secondsLeft - 1);
      if (secondsLeft <= 4) sfx.tick();
    }, 1000);
    return () => clearTimeout(t);
  });

  function advance() {
    if (!feedback) return;
    setFeedback(null);
    if (hearts <= 0) return end(false);
    if (i + 1 >= questions.length) return end(true);
    setSecondsLeft(secondsFor(questions[i + 1].kind));
    setI((n) => n + 1);
  }

  // Save the round once it ends.
  const stars = starsFor(hearts, finished);
  useEffect(() => {
    if (phase !== "done" || saving.current) return;
    saving.current = true;
    const save =
      mode === "ripasso"
        ? api<Result>("/api/review", { topic: topicId, results: log })
        : mode === "sfida"
          ? api<Result>("/api/weekly", { topic: topicId, week, results: log })
          : api<Result>("/api/progress", { topic: topicId, level: level.id, correct, total: answeredOriginals, hearts, finished, score, results: log });
    save.then(setResult).catch((e) => setSaveError((e as Error).message));
  }, [phase, mode, topicId, week, level.id, correct, answeredOriginals, hearts, finished, score, log, saveTry]);

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
              <div className="h-4 flex-1 overflow-hidden rounded-full border-[3px] border-[var(--edge)] bg-[var(--surface)]" role="progressbar" aria-valuemin={0} aria-valuemax={originals} aria-valuenow={done} aria-label="Avanzamento">
                <motion.div className="h-full bg-[var(--basil)]" initial={false} animate={{ width: `${(done / Math.max(1, originals)) * 100}%` }} />
              </div>
              {!practice && <Hearts n={hearts} />}
            </>
          ) : (
            <p className="font-display text-xl">{level.stop}</p>
          )}
        </header>

        {phase === "play" && (
          <div className="mt-3 flex items-center justify-between text-sm font-extrabold">
            <span>{score} punti</span>
            {streak >= 3 && (
              <motion.span key={mult} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="rounded-full bg-[var(--tomato-ink)] px-2.5 py-0.5 text-white">
                ×{mult} serie da {streak}
              </motion.span>
            )}
            {q?.retry && <span className="text-[var(--muted)]">Di nuovo · no heart at stake</span>}
            {practice && <span className="text-[var(--muted)]">{level.title}</span>}
            {level.timed && <span className={secondsLeft <= 3 ? "text-[var(--danger)]" : ""}>⏱ {secondsLeft}s</span>}
          </div>
        )}

        {phase === "intro" && (
          <section className="ticket mt-6 flex flex-col gap-4 p-6">
            <p className="text-[var(--muted)]">
              {practice ? level.gloss : `Fermata ${index + 1} · ${level.gloss}`}
            </p>
            <h1 className="font-display text-3xl leading-tight">{level.title}</h1>
            <ul className="flex flex-col gap-2">
              {level.intro.map((line) => (
                <li key={line} className="rounded-xl border-[2.5px] border-[var(--edge)] px-3 py-2 font-semibold">
                  {line}
                </li>
              ))}
            </ul>
            {!practice && (
              <p className="text-sm text-[var(--muted)]">
                {level.questionsPerRound} questions · {HEARTS} hearts{level.timed ? " · a timer on each question" : ""}. Stars = hearts left at the end. Misses come back once for a second try.
              </p>
            )}
            <button className="btn btn-primary" onClick={begin} autoFocus>
              Inizia
            </button>
          </section>
        )}

        {phase === "play" && q && (
          <motion.section animate={shake} className="mt-5 flex flex-1 flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div key={q.id + i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.18 }} className="flex flex-col gap-4">
                <QuestionCard q={q} focus={q.kind === "choice"} />
                {q.kind === "choice" && <Choices q={q} locked={!!feedback} onAnswer={(o) => answer(o, o === q.answer ? "right" : "wrong")} />}
                {q.kind === "type" && <Typed q={q} locked={!!feedback} onAnswer={(t) => answer(t, checkTyped(t, [q.answer, ...(q.accept ?? [])]))} />}
                {q.kind === "tiles" && (
                  <Tiles
                    q={q}
                    locked={!!feedback}
                    onAnswer={(words) =>
                      answer(words.join(" "), [q.answer, ...(q.accept ?? [])].some((a) => a.join(" ") === words.join(" ")) ? "right" : "wrong")
                    }
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.section>
        )}

        {phase === "done" && practice && <PracticeResults mode={mode} correct={correct} answered={answeredOriginals} result={result} saveError={saveError} onRetrySave={retrySave} />}

        {phase === "done" && !practice && (
          <Results
            stars={stars}
            finished={finished}
            score={score}
            correct={correct}
            answered={answeredOriginals}
            result={result}
            saveError={saveError}
            next={next ? { stop: next.stop, href: `/play/${topicId}/${next.id}` } : undefined}
            onRetrySave={retrySave}
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
    <span className="flex gap-0.5" role="img" aria-label={`${n} cuori su ${HEARTS}`}>
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

/** Renders "___" as a visible blank to fill. */
function WithGap({ text }: { text: string }) {
  const parts = text.split("___");
  return (
    <>
      {parts.map((part, k) => (
        <span key={k}>
          {part}
          {k < parts.length - 1 && (
            <span className="mx-1 inline-block min-w-16 translate-y-1 border-b-[3px] border-dashed border-[var(--brand)]" role="img" aria-label="spazio vuoto (blank)">
              &nbsp;
            </span>
          )}
        </span>
      ))}
    </>
  );
}

function QuestionCard({ q, focus }: { q: Question; focus: boolean }) {
  // A single word (verb) gets the big display treatment.
  const isAux = q.id.startsWith("aux-") || q.id.includes("-choice-");
  // Move focus to each new question so screen readers read it (typed questions focus their input instead).
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true });
  }, [focus]);
  return (
    <div ref={ref} tabIndex={-1} className="ticket flex flex-col gap-2 p-5 focus:outline-none">
      <p className="font-bold">{q.task}</p>
      <p className={`font-extrabold leading-snug ${isAux ? "font-display text-5xl" : "text-2xl"}`} lang={q.kind === "tiles" ? "en" : "it"}>
        <WithGap text={q.prompt} />
      </p>
      {"hint" in q && q.hint && <p className="text-[var(--muted)]">{q.hint}</p>}
    </div>
  );
}

function Choices({ q, locked, onAnswer }: { q: Extract<Question, { kind: "choice" }>; locked: boolean; onAnswer: (o: string) => void }) {
  const two = q.options.length === 2;
  const [picked, setPicked] = useState<string | null>(null);
  // Number keys 1–4 pick an option.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!locked && n >= 1 && n <= q.options.length) {
        setPicked(q.options[n - 1]);
        onAnswer(q.options[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q.options, locked, onAnswer]);

  // After answering, the right option turns green and a wrong pick is struck through,
  // so you see the correction where you were looking, not only in the sheet below.
  const mark = (o: string) =>
    !locked || picked === null
      ? ""
      : o === q.answer
        ? "!bg-[var(--basil)] !text-white !opacity-100"
        : o === picked
          ? "line-through !opacity-100"
          : "";

  return (
    <div className={`grid gap-3 ${two ? "grid-cols-2" : "grid-cols-1"}`}>
      {q.options.map((o) => (
        <motion.button
          key={o}
          whileTap={{ scale: 0.96 }}
          disabled={locked}
          onClick={() => {
            setPicked(o);
            onAnswer(o);
          }}
          className={`btn ${two ? (o === "essere" ? "btn-primary" : "btn-tomato") + " !py-6 text-2xl" : "btn-secondary justify-start text-left"} ${mark(o)}`}
        >
          {o === q.answer && locked && picked !== null && <span className="sr-only">Risposta giusta: </span>}
          {o}
        </motion.button>
      ))}
    </div>
  );
}

function Typed({ locked, onAnswer }: { q: Extract<Question, { kind: "type" }>; locked: boolean; onAnswer: (t: string) => void }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useEffect(() => ref.current?.focus(), []);
  // After an accent key, put the cursor right after the inserted letter (React would leave it at the end).
  useLayoutEffect(() => {
    if (caret.current === null) return;
    ref.current?.focus();
    ref.current?.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [value]);
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
        placeholder="Scrivi qui (type here)"
      />
      <AccentKeys
        onKey={(k) => {
          // Insert where the cursor is (or replace the selection), and keep the keyboard open.
          const el = ref.current;
          const from = el?.selectionStart ?? value.length;
          const to = el?.selectionEnd ?? value.length;
          caret.current = from + k.length;
          setValue(value.slice(0, from) + k + value.slice(to));
        }}
      />
      <button className="btn btn-primary" disabled={locked || !value.trim()}>
        Controlla
      </button>
    </form>
  );
}

function AccentKeys({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-[var(--muted)]">Need an accent? Tap to add it:</p>
      <div className="flex gap-2" role="group" aria-label="Accented letters">
        {["à", "è", "é", "ì", "ò", "ù"].map((k) => (
          <button key={k} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onKey(k)} className="h-11 flex-1 rounded-xl border-[2px] border-[var(--locked)] bg-[var(--surface)] text-lg font-bold">
            {k}
          </button>
        ))}
      </div>
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
        {picked.length === 0 && <span className="text-[var(--muted)]">Your sentence appears here</span>}
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
      className={`fixed inset-x-0 bottom-0 z-50 border-t-[3px] border-[var(--edge)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 ${ok ? "bg-[var(--ok-bg)] text-[var(--ok-fg)]" : "bg-[var(--no-bg)] text-[var(--no-fg)]"}`}
    >
      <div className="mx-auto flex max-w-[560px] flex-col gap-2">
        <p className="font-display text-2xl">
          {ok ? (f.verdict === "accent" ? "Giusto, ma attenzione all'accento!" : "Giusto!") : f.timedOut ? "Tempo scaduto!" : "Non proprio…"}
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
          className={`btn mt-1 ${ok ? "bg-[var(--basil)] text-white" : "bg-[var(--tomato-ink)] text-white"}`}
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
  next,
  timed,
  onRetry,
  onRetrySave,
}: {
  timed?: boolean;
  stars: number;
  finished: boolean;
  score: number;
  correct: number;
  answered: number;
  result: Result | null;
  saveError: string | null;
  next?: { stop: string; href: string };
  onRetry: () => void;
  onRetrySave: () => void;
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
      <div className="flex gap-3" role="img" aria-label={`${stars} stelle su 3`}>
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
      {result && (
        <p className="text-[var(--muted)]">
          +{result.xp} punti per la sfida{result.mastered ? " · already mastered, replays count 25%" : ""}
        </p>
      )}
      {result?.newBest && <span className="stamp">Record!</span>}
      {result?.unlockedNext && next && <p className="font-bold text-[var(--success)]">Hai sbloccato {next.stop}!</p>}
      {saveError && <SaveError message={saveError} onRetry={onRetrySave} />}
      <div className="flex w-full flex-col gap-2">
        {/* Once the round is saved with a star, the next stop is open: make going on the obvious move. */}
        {finished && next && result ? (
          <>
            <Link href={next.href} className="btn btn-primary" onClick={() => sfx.pop()}>
              Avanti: {next.stop}
            </Link>
            <button className="btn btn-secondary" onClick={onRetry}>
              {stars === 3 ? "Gioca ancora" : "Riprova"}
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onRetry}>
            {finished && stars === 3 ? "Gioca ancora" : "Riprova"}
          </button>
        )}
        <Link href="/" className="btn btn-ghost">
          Torna alla mappa
        </Link>
      </div>
    </section>
  );
}

function PracticeResults({
  mode,
  correct,
  answered,
  result,
  saveError,
  onRetrySave,
}: {
  onRetrySave: () => void;
  mode: Mode;
  correct: number;
  answered: number;
  result: Result | null;
  saveError: string | null;
}) {
  useEffect(() => {
    if (correct / Math.max(1, answered) >= 0.7) sfx.bravo();
  }, [correct, answered]);
  return (
    <section className="ticket mt-6 flex flex-col items-center gap-4 p-6 text-center">
      <h1 className="font-display text-4xl">{correct === answered ? "Perfetto!" : correct / Math.max(1, answered) >= 0.7 ? "Bravo!" : "Avanti così!"}</h1>
      <p className="text-lg font-bold">
        {correct}/{answered} giuste
      </p>
      {result && mode === "ripasso" && (
        <p className="text-[var(--muted)]">
          {result.promoted} moved up — they&apos;ll come back later. {result.reset ? `${result.reset} back to the start.` : ""}
        </p>
      )}
      {result && (
        <p className="font-bold text-[var(--success)]">
          +{result.xp} punti{mode === "sfida" && result.firstAttempt === false ? " · replay, practice only" : ""}
        </p>
      )}
      {saveError && <SaveError message={saveError} onRetry={onRetrySave} />}
      <Link href="/" className="btn btn-primary">
        Torna alla mappa
      </Link>
    </section>
  );
}

/** A failed save keeps the round on screen and offers another try, instead of losing it. */
function SaveError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex w-full flex-col gap-2">
      <p className="error">Round not saved yet: {message}</p>
      <button className="btn btn-tomato" onClick={onRetry}>
        Riprova a salvare
      </button>
    </div>
  );
}
