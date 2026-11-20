import type { Question, Topic } from "../types";
import { AVERE, ESSERE, REFLEXIVES, REFLEXIVE_PRONOUN, VERBS, agree, type Person, type Verb } from "./verbs";
import { EITHER_AUX, PRONOUN_AGREEMENT, SENTENCES, TILES } from "./sentences";

// ── helpers ──────────────────────────────────────────────────────────

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);
const uniq = (xs: string[]) => [...new Set(xs)];

const regulars = VERBS.filter((v) => v.set === "regolare");
const irr1 = VERBS.filter((v) => v.set === "irregolare-1");
const irr2 = VERBS.filter((v) => v.set === "irregolare-2");
const fixedAux = (vs: Verb[]) => vs.filter((v) => v.aux !== "entrambi");

/** Other forms that are also correct Italian — never use them as wrong options; accept them when typed. */
const VALID_ALT: Record<string, string[]> = { vedere: ["veduto"], perdere: ["perduto"] };

/**
 * Wrong options for irregular participles. Each list mixes the over-regularised form
 * learners produce with a plausible-looking irregular, so the answer isn't simply
 * "the one that doesn't look regular".
 */
const IRR_DISTRACTORS: Record<string, string[]> = {
  aprire: ["aprito", "aperso"],
  bere: ["beuto", "bevito"],
  chiedere: ["chieduto", "chiuso"],
  chiudere: ["chiuduto", "chiesto"],
  dire: ["dito", "ditto"],
  essere: ["essuto", "statuto"],
  fare: ["faciuto", "fato"],
  leggere: ["leggiuto", "lesso"],
  mettere: ["mettuto", "misto"],
  nascere: ["nasciuto", "nasto"],
  perdere: ["perdito", "perto"],
  prendere: ["prenduto", "presto"],
  rimanere: ["rimanuto", "rimaso"],
  scrivere: ["scrivuto", "scriso"],
  vedere: ["vedito", "visso"],
  venire: ["venito", "venso"],
  accendere: ["accenduto", "accesto"],
  decidere: ["deciduto", "decisto"],
  dipingere: ["dipinguto", "dipinso"],
  rispondere: ["risponduto", "risposo"],
  rompere: ["romputo", "romposto"],
  scegliere: ["sceglito", "scelso"],
  spendere: ["spenduto", "spesto"],
  spegnere: ["spegnuto", "spenso"],
  togliere: ["toglito", "tolso"],
  vincere: ["vinciuto", "vinso"],
  offrire: ["offrito", "offerso"],
  piangere: ["pianguto", "pianso"],
  ridere: ["riduto", "risto"],
  nascondere: ["nasconduto", "nascoso"],
  morire: ["morito", "muorto"],
  correre: ["corruto", "correso"],
  vivere: ["vivuto", "visto"],
  scendere: ["scenduto", "scesto"],
};

function endingRule(inf: string) {
  return inf.endsWith("are") ? "-are → -ato" : inf.endsWith("ere") ? "-ere → -uto" : "-ire → -ito";
}

type Subject = { text: string; person: Person; g: "m" | "f"; pl: boolean; mixed?: boolean };

// Original names. io/tu/noi carry a hint so gender is never a guess.
const SUBJECTS: Subject[] = [
  { text: "Giulia", person: "lei", g: "f", pl: false },
  { text: "Marco", person: "lui", g: "m", pl: false },
  { text: "Il treno", person: "lui", g: "m", pl: false },
  { text: "La nonna", person: "lei", g: "f", pl: false },
  { text: "Luca e Paolo", person: "loro", g: "m", pl: true },
  { text: "Anna e Chiara", person: "loro", g: "f", pl: true },
  { text: "Luca e Anna", person: "loro", g: "m", pl: true, mixed: true },
  { text: "Io (Sara)", person: "io", g: "f", pl: false },
  { text: "Io (Davide)", person: "io", g: "m", pl: false },
  { text: "Tu (Elena)", person: "tu", g: "f", pl: false },
  { text: "Noi (Marta e Lucia)", person: "noi", g: "f", pl: true },
  { text: "Voi (Pietro e Tommaso)", person: "voi", g: "m", pl: true },
];

// Things that aren't people only do a few things.
const TRAIN_VERBS = ["arrivare", "partire"];
// Avere verbs that sound complete without an object ("Marco ha dormito." ✓, "Marco ha portato." ✗).
const NO_OBJECT_OK = [
  "parlare", "mangiare", "lavorare", "studiare", "dormire", "viaggiare", "camminare", "telefonare",
  "giocare", "cucinare", "pagare", "capire", "ascoltare", "bere", "leggere", "scrivere",
];
// Essere verbs that need a complement to be a sentence ("Marco è stato." ✗ → "Marco è stato a casa." ✓).
const COMPLEMENT: Record<string, string> = { andare: "a casa", stare: "a casa", essere: "a Roma" };
const NEEDS_NOUN = ["diventare"]; // "è diventata …" needs a noun — keep out of bare sentences
// Avere verbs with no object: "what?" doesn't apply, so they get their own explanation.
const INTRANSITIVE_AVERE = ["dormire", "lavorare", "camminare", "viaggiare", "telefonare", "abitare", "giocare", "parlare", "credere"];

const fits = (s: Subject, v: Verb) =>
  (s.text !== "Il treno" || TRAIN_VERBS.includes(v.inf)) &&
  (v.aux !== "avere" || NO_OBJECT_OK.includes(v.inf)) &&
  !NEEDS_NOUN.includes(v.inf);

const rest = (v: Verb) => (COMPLEMENT[v.inf] ? ` ${COMPLEMENT[v.inf]}` : "");

function perfect(s: Subject, v: Verb) {
  const essere = v.aux === "essere";
  const aux = (essere ? ESSERE : AVERE)[s.person];
  const pp = essere ? agree(v.pp, s.g, s.pl) : v.pp;
  return { aux, pp, essere };
}

/** Pick n questions with an even split by answer (e.g. 6 avere + 6 essere). */
function balancedByAnswer(pool: Question[], n: number) {
  const groups = new Map<string, Question[]>();
  for (const q of shuffle(pool)) {
    const key = q.kind === "tiles" ? "" : q.answer;
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  const lists = [...groups.values()];
  const per = Math.ceil(n / lists.length);
  return shuffle(lists.flatMap((l) => l.slice(0, per))).slice(0, n);
}

// ── participles (levels 1, 5, 6) ─────────────────────────────────────

function participleQuestions(vs: Verb[], idPrefix: string, irregular: boolean): Question[] {
  return vs.flatMap((v) => {
    const stem = v.inf.slice(0, -3);
    const wrong = irregular
      ? IRR_DISTRACTORS[v.inf] ?? [stem + "uto", stem + "ito"]
      : [stem + "ato", stem + "uto", stem + "ito"];
    const valid = [v.pp, ...(VALID_ALT[v.inf] ?? [])];
    const distractors = shuffle(uniq(wrong).filter((o) => !valid.includes(o))).slice(0, 2);
    const explain = irregular
      ? `${v.inf} → ${v.pp}. Irregular: learn it by heart.${VALID_ALT[v.inf] ? ` (${VALID_ALT[v.inf].join(", ")} also exists, but ${v.pp} is more common.)` : ""}`
      : `${v.inf} → ${v.pp} (${endingRule(v.inf)}).`;
    return [
      {
        kind: "type" as const,
        task: "Write the participle",
        skill: `pp:${v.inf}`,
        id: `${idPrefix}-type-${v.inf}`,
        prompt: `${v.inf} → ___`,
        hint: v.en,
        answer: v.pp,
        accept: VALID_ALT[v.inf],
        explain,
      },
      {
        kind: "choice" as const,
        task: "Pick the past participle",
        skill: `pp:${v.inf}`,
        id: `${idPrefix}-choice-${v.inf}`,
        prompt: v.inf,
        hint: v.en,
        options: shuffle([v.pp, ...distractors]),
        answer: v.pp,
        explain,
      },
    ];
  });
}

// ── level 2: avere or essere ─────────────────────────────────────────

function auxExplain(v: Verb) {
  if (v.aux === "essere") return `${v.inf} takes essere: movement to a place, change, or being/staying.`;
  if (["camminare", "viaggiare"].includes(v.inf))
    return `${v.inf} takes avere: movement with no destination → avere (ho camminato, ho viaggiato).`;
  if (INTRANSITIVE_AVERE.includes(v.inf)) return `${v.inf} takes avere — most verbs do, even without an object.`;
  return `${v.inf} takes avere: you can ask "what?" — ho ${v.pp} (che cosa?).`;
}

function auxQuestions(): Question[] {
  return fixedAux([...regulars, ...irr1]).map((v) => ({
    kind: "choice" as const,
    task: "Avere or essere?",
    skill: `aux:${v.inf}`,
    id: `aux-${v.inf}`,
    prompt: v.inf,
    hint: v.en,
    options: ["avere", "essere"],
    answer: v.aux,
    explain: auxExplain(v),
  }));
}

// ── level 3: the auxiliary in the present ────────────────────────────

function auxFormQuestions(): Question[] {
  const out: Question[] = [];
  for (const v of fixedAux([...regulars, ...irr1])) {
    const candidates = SUBJECTS.filter((x) => fits(x, v));
    if (candidates.length === 0) continue; // e.g. "portare" needs an object
    const s = pick(candidates);
    const { aux, pp, essere } = perfect(s, v);
    const why = `${s.person} → ${aux}. ${v.inf} takes ${essere ? "essere" : "avere"}.`;

    // Production: write auxiliary + participle — both decisions at once.
    out.push({
      kind: "type",
      task: "Write the passato prossimo: auxiliary + participle",
      skill: `auxform:${v.inf}`,
      id: `auxform-type-${v.inf}`,
      prompt: `${s.text} ___${rest(v)}. (${v.inf})`,
      hint: v.en,
      answer: `${aux} ${pp}`,
      explain: `${why} ${essere ? `It agrees: ${pp}.` : ""}`.trim(),
    });

    // Recognition: the participle ending is hidden, so it can't give the auxiliary away.
    const other = (essere ? AVERE : ESSERE)[s.person];
    const sameAuxWrong = Object.values(essere ? ESSERE : AVERE).filter((f) => f !== aux);
    out.push({
      kind: "choice",
      task: "Pick the form of avere/essere",
      skill: `auxform:${v.inf}`,
      id: `auxform-${v.inf}`,
      prompt: `${s.text} ___ ${v.pp.slice(0, -1)}_${rest(v)}.`,
      hint: `${v.inf}: ${v.en}`,
      options: shuffle(uniq([aux, other, ...shuffle(sameAuxWrong).slice(0, 2)])).slice(0, 4),
      answer: aux,
      explain: why,
    });
  }
  return out;
}

// ── level 4: agreement ───────────────────────────────────────────────

function agreementExplain(s: Subject, essere: boolean) {
  if (!essere) return "With avere the participle stays -o.";
  if (s.mixed) return "Essere agrees with the subject. A mixed group takes -i.";
  if (s.pl) return s.g === "m" ? "Essere agrees: plural male (or mixed) → -i." : "Essere agrees: plural female → -e.";
  return s.g === "m" ? "Essere agrees: singular male → -o." : "Essere agrees: singular female → -a.";
}

function agreementQuestions(): Question[] {
  const out: Question[] = [];
  const verbs = fixedAux([...regulars, ...irr1]);
  for (const s of SUBJECTS) {
    // 3 essere verbs + 1 avere verb per subject: with avere it stays -o.
    const ess = shuffle(verbs.filter((v) => v.aux === "essere" && fits(s, v))).slice(0, 3);
    const av = shuffle(verbs.filter((v) => v.aux === "avere" && v.inf !== "avere" && fits(s, v))).slice(0, 1);
    [...ess, ...av].forEach((v, k) => {
      const { aux, pp, essere } = perfect(s, v);
      const forms = [agree(v.pp, "m", false), agree(v.pp, "f", false), agree(v.pp, "m", true), agree(v.pp, "f", true)];
      const base = { id: `agree-${v.inf}-${s.text}`, skill: `agree:${s.g}${s.pl ? "pl" : "sg"}:${essere ? "essere" : "avere"}`, hint: `${v.inf}: ${v.en}`, explain: agreementExplain(s, essere) };
      // About 1 in 4 is typed, so the ending has to be produced, not just spotted.
      out.push(
        k === 0
          ? { ...base, kind: "type", task: "Write the participle with its ending", prompt: `${s.text} ${aux} ___${rest(v)}. (${v.inf})`, answer: pp }
          : { ...base, kind: "choice", task: "Pick the right ending", prompt: `${s.text} ${aux} ___${rest(v)}.`, options: forms, answer: pp },
      );
    });
  }
  return out;
}

// ── reflexives: pronoun + essere + agreement ─────────────────────────

function reflexiveQuestions(): Question[] {
  const out: Question[] = [];
  const people = SUBJECTS.filter((s) => s.text !== "Il treno");
  for (const r of REFLEXIVES) {
    for (const s of shuffle(people).slice(0, 3)) {
      const pron = REFLEXIVE_PRONOUN[s.person];
      const aux = ESSERE[s.person];
      const pp = agree(r.pp, s.g, s.pl);
      const right = `${pron} ${aux} ${pp}`;
      const wrongAgree = agree(r.pp, s.g === "m" ? "f" : "m", s.pl);
      const wrongPron = pick(Object.values(REFLEXIVE_PRONOUN).filter((x) => x !== pron));
      const rest = r.rest ? ` ${r.rest}` : "";
      const id = `refl-${r.inf}-${s.text}`;
      const explain = `${r.inf}: ${pron} + ${aux} + ${pp}. Reflexives always take essere, and agree.`;
      out.push(
        {
          kind: "choice",
          task: "Pick the reflexive pronoun",
          skill: `refl-pron:${s.person}`,
          id: `${id}-pron`,
          prompt: `${s.text} ___ ${aux} ${pp}${rest}.`,
          hint: r.en,
          options: shuffle(uniq([pron, ...shuffle(["mi", "ti", "si", "ci", "vi"].filter((x) => x !== pron)).slice(0, 3)])),
          answer: pron,
          explain: `${s.person} → ${pron}. ${explain}`,
        },
        {
          kind: "choice",
          task: "Pick the verb in the passato prossimo",
          skill: `refl:${r.inf}`,
          id: `${id}-form`,
          prompt: `${s.text} ___${rest}. (${r.inf})`,
          hint: r.en,
          options: shuffle(uniq([right, `${pron} ${AVERE[s.person]} ${r.pp}`, `${pron} ${aux} ${wrongAgree}`, `${wrongPron} ${aux} ${pp}`])),
          answer: right,
          explain,
        },
        {
          kind: "type",
          task: "Write the passato prossimo: pronoun + auxiliary + participle",
          skill: `refl:${r.inf}`,
          id: `${id}-type`,
          prompt: `${s.text} ___${rest}. (${r.inf})`,
          hint: r.en,
          answer: right,
          explain,
        },
      );
    }
  }
  return out;
}

// ── levels ───────────────────────────────────────────────────────────

export const passatoProssimo: Topic = {
  id: "passato-prossimo",
  title: "Passato prossimo",
  levels: [
    {
      id: "pp-1-participi-regolari",
      stop: "Torino",
      title: "Participi regolari",
      gloss: "Regular past participles",
      intro: ["-are → -ato: parlare → parlato", "-ere → -uto: credere → creduto", "-ire → -ito: dormire → dormito"],
      questionsPerRound: 8,
      build: () => participleQuestions(regulars, "reg", false),
    },
    {
      id: "pp-2-avere-o-essere",
      stop: "Milano",
      title: "Avere o essere?",
      gloss: "Pick the auxiliary",
      intro: [
        "Most verbs take avere: ho mangiato, ho dormito.",
        "Going to a place, change and staying take essere: sono andato.",
        "But walking or travelling with no destination → avere: ho camminato.",
      ],
      questionsPerRound: 12,
      build: auxQuestions,
      pick: balancedByAnswer, // 6 avere + 6 essere, so "always avere" can't win
    },
    {
      id: "pp-3-ausiliare",
      stop: "Venezia",
      title: "Ho, hai, ha… sono, sei, è…",
      gloss: "The auxiliary for each person",
      intro: ["avere: ho, hai, ha, abbiamo, avete, hanno", "essere: sono, sei, è, siamo, siete, sono", "Some questions ask you to write both words."],
      questionsPerRound: 10,
      build: auxFormQuestions,
    },
    {
      id: "pp-4-accordo",
      stop: "Bologna",
      title: "Andato, andata, andati, andate",
      gloss: "Agreement with essere",
      intro: [
        "With essere the participle agrees: Giulia è andata.",
        "Plural: -i (all male or mixed), -e (all female).",
        "With avere it stays -o: Giulia ha mangiato.",
      ],
      questionsPerRound: 10,
      build: agreementQuestions,
    },
    {
      id: "pp-5-irregolari-1",
      stop: "Firenze",
      title: "Participi irregolari I",
      gloss: "The 16 irregulars from lesson 7",
      intro: ["fare → fatto, dire → detto, vedere → visto…", "No rule here: these you learn by heart."],
      questionsPerRound: 10,
      build: () => participleQuestions(irr1, "irr1", true),
    },
    {
      id: "pp-6-irregolari-2",
      stop: "Siena",
      title: "Participi irregolari II",
      gloss: "More irregulars",
      intro: ["Patterns help: -so (acceso, deciso, speso), -sto (risposto, nascosto)", "-tto (rotto), -nto (dipinto, spento, vinto, pianto)."],
      questionsPerRound: 10,
      build: () => participleQuestions(irr2, "irr2", true),
    },
    {
      id: "pp-7-riflessivi",
      stop: "Roma",
      title: "Mi sono alzata, ci siamo divertiti",
      gloss: "Reflexive verbs",
      intro: [
        "Reflexives always take essere: mi sono svegliato.",
        "Pronoun first: mi, ti, si, ci, vi, si.",
        "The participle agrees: Giulia si è alzata.",
      ],
      questionsPerRound: 10,
      build: reflexiveQuestions,
    },
    {
      id: "pp-8-frasi",
      stop: "Napoli",
      title: "Ieri, stamattina, due anni fa…",
      gloss: "Whole sentences",
      intro: ["Put it together: auxiliary + participle, with time words.", "Negative: non goes before the auxiliary."],
      questionsPerRound: 10,
      build: () => [...SENTENCES, ...TILES],
    },
    {
      id: "pp-8b-due-ausiliari",
      stop: "Bari",
      title: "Ho finito… è finita",
      gloss: "Either auxiliary · lo, la, li, le",
      intro: [
        "Some verbs take both: with an object → avere (ho finito il lavoro).",
        "No object → essere (la lezione è finita).",
        "Bonus: l'ho vista — lo, la, li, le make avere agree.",
      ],
      questionsPerRound: 8,
      build: () => [...EITHER_AUX, ...PRONOUN_AGREEMENT],
      // Mostly either-auxiliary verbs; at most 2 of the A2 pronoun bonus.
      pick: (pool, n) => {
        const pron = shuffle(pool.filter((q) => q.id.startsWith("pron-"))).slice(0, 2);
        return shuffle([...pron, ...shuffle(pool.filter((q) => !q.id.startsWith("pron-"))).slice(0, n - pron.length)]);
      },
    },
    {
      id: "pp-9-boss",
      stop: "Palermo",
      title: "La sfida finale",
      gloss: "Everything, against the clock",
      intro: ["Everything you've practised, nothing new.", "Each question has its own timer: run out and you lose a heart."],
      questionsPerRound: 15,
      timed: true,
      build: () => [
        ...balancedByAnswer(auxQuestions(), 6),
        ...shuffle(agreementQuestions()).slice(0, 6),
        ...shuffle(participleQuestions([...irr1, ...irr2], "boss", true)).slice(0, 8),
        ...shuffle(reflexiveQuestions()).slice(0, 6),
        ...shuffle(EITHER_AUX).slice(0, 4),
        ...SENTENCES,
      ],
    },
  ],
};
