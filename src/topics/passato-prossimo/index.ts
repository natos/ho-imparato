import type { Question, Topic } from "../types";
import { AVERE, ESSERE, REFLEXIVES, REFLEXIVE_PRONOUN, VERBS, agree, type Person, type Verb } from "./verbs";
import { BOSS_EXTRAS, SENTENCES, TILES } from "./sentences";

// ── helpers ──────────────────────────────────────────────────────────

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);
const uniq = (xs: string[]) => [...new Set(xs)];

const regulars = VERBS.filter((v) => v.set === "regolare");
const irr1 = VERBS.filter((v) => v.set === "irregolare-1");
const irr2 = VERBS.filter((v) => v.set === "irregolare-2");
const fixedAux = (vs: Verb[]) => vs.filter((v) => v.aux !== "entrambi");

/** The "regular-looking" wrong participle learners actually produce. */
function fakeRegular(inf: string) {
  const stem = inf.slice(0, -3);
  if (inf.endsWith("are")) return stem + "ato";
  if (inf.endsWith("ere")) return stem + "uto";
  return stem + "ito";
}

function endingRule(inf: string) {
  return inf.endsWith("are") ? "-are → -ato" : inf.endsWith("ere") ? "-ere → -uto" : "-ire → -ito";
}

type Subject = { text: string; person: Person; g: "m" | "f"; pl: boolean };

// Original names. io/tu/noi carry a hint so gender is never a guess.
const SUBJECTS: Subject[] = [
  { text: "Giulia", person: "lei", g: "f", pl: false },
  { text: "Marco", person: "lui", g: "m", pl: false },
  { text: "Il treno", person: "lui", g: "m", pl: false },
  { text: "La nonna", person: "lei", g: "f", pl: false },
  { text: "Luca e Paolo", person: "loro", g: "m", pl: true },
  { text: "Anna e Chiara", person: "loro", g: "f", pl: true },
  { text: "Luca e Anna", person: "loro", g: "m", pl: true }, // mixed group → -i
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
const fits = (s: Subject, v: Verb) =>
  (s.text !== "Il treno" || TRAIN_VERBS.includes(v.inf)) && (v.aux !== "avere" || NO_OBJECT_OK.includes(v.inf));

function perfect(s: Subject, v: Verb) {
  const essere = v.aux === "essere";
  const aux = (essere ? ESSERE : AVERE)[s.person];
  const pp = essere ? agree(v.pp, s.g, s.pl) : v.pp;
  return { aux, pp, essere };
}

// ── level 1: regular participles ─────────────────────────────────────

function participleQuestions(vs: Verb[], idPrefix: string, irregular: boolean): Question[] {
  return vs.flatMap((v) => {
    const wrong = fakeRegular(v.inf);
    const options = uniq(
      irregular
        ? [v.pp, wrong, v.inf.slice(0, -3) + (v.inf.endsWith("ere") ? "ito" : "uto")]
        : [v.pp, v.inf.slice(0, -3) + "ato", v.inf.slice(0, -3) + "uto", v.inf.slice(0, -3) + "ito"],
    );
    const explain = irregular
      ? `${v.inf} → ${v.pp}. Irregular: learn it by heart.`
      : `${v.inf} → ${v.pp} (${endingRule(v.inf)}).`;
    return [
      {
        kind: "type" as const,
        task: `Write the past participle of “${v.inf}”`,
        id: `${idPrefix}-type-${v.inf}`,
        prompt: `${v.inf} → ___`,
        hint: v.en,
        answer: v.pp,
        explain,
      },
      {
        kind: "choice" as const,
        task: "Pick the past participle",
        id: `${idPrefix}-choice-${v.inf}`,
        prompt: v.inf,
        hint: v.en,
        options: shuffle([v.pp, ...shuffle(options.filter((o) => o !== v.pp)).slice(0, 2)]),
        answer: v.pp,
        explain,
      },
    ];
  });
}

// ── level 2: avere or essere ─────────────────────────────────────────

function auxQuestions(): Question[] {
  return fixedAux([...regulars, ...irr1]).map((v) => ({
    kind: "choice" as const,
    task: "Does this verb take avere or essere?",
    id: `aux-${v.inf}`,
    prompt: v.inf,
    hint: v.en,
    options: ["avere", "essere"],
    answer: v.aux,
    explain:
      v.aux === "essere"
        ? `${v.inf} takes essere: movement, change, or being/staying.`
        : `${v.inf} takes avere, like most verbs. Ask "what?": ho ${v.pp} (che cosa?).`,
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
    const other = (essere ? AVERE : ESSERE)[s.person];
    const sameAuxWrong = Object.values(essere ? ESSERE : AVERE).filter((f) => f !== aux);
    out.push({
      kind: "choice",
      task: "Pick the right form of avere or essere",
      id: `auxform-${v.inf}-${s.person}-${s.g}`,
      prompt: `${s.text} ___ ${pp}.`,
      hint: `${v.inf}: ${v.en}`,
      options: shuffle(uniq([aux, other, ...shuffle(sameAuxWrong).slice(0, 2)])).slice(0, 4),
      answer: aux,
      explain: `${s.person} → ${aux}. ${v.inf} takes ${essere ? "essere" : "avere"}.`,
    });
  }
  return out;
}

// ── level 4: agreement ───────────────────────────────────────────────

function agreementQuestions(): Question[] {
  const out: Question[] = [];
  const verbs = fixedAux([...regulars, ...irr1]);
  for (const s of SUBJECTS) {
    // 3 essere verbs + 1 avere verb per subject: with avere it stays -o.
    const ess = shuffle(verbs.filter((v) => v.aux === "essere" && fits(s, v))).slice(0, 3);
    const av = shuffle(verbs.filter((v) => v.aux === "avere" && v.inf !== "avere" && fits(s, v))).slice(0, 1);
    for (const v of [...ess, ...av]) {
      const { aux, pp, essere } = perfect(s, v);
      const forms = [agree(v.pp, "m", false), agree(v.pp, "f", false), agree(v.pp, "m", true), agree(v.pp, "f", true)];
      out.push({
        kind: "choice",
        task: "Pick the right ending",
        id: `agree-${v.inf}-${s.text}`,
        prompt: `${s.text} ${aux} ___.`,
        hint: `${v.inf}: ${v.en}`,
        options: forms,
        answer: pp,
        explain: essere
          ? s.g === "m" && s.pl && s.text.includes(" e ")
            ? `Essere agrees with the subject. A mixed group takes -i.`
            : `Essere agrees with the subject: -o, -a, -i, -e.`
          : `With avere the participle stays -o.`,
      });
    }
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
          id: `${id}-form`,
          prompt: `${s.text} ___${rest}. (${r.inf})`,
          hint: r.en,
          options: shuffle(uniq([right, `${pron} ${AVERE[s.person]} ${r.pp}`, `${pron} ${aux} ${wrongAgree}`, `${wrongPron} ${aux} ${pp}`])),
          answer: right,
          explain,
        },
        {
          kind: "type",
          task: "Write the verb in the passato prossimo: pronoun + auxiliary + participle",
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
      questionsPerRound: 10,
      build: () => participleQuestions(regulars, "reg", false),
    },
    {
      id: "pp-2-avere-o-essere",
      stop: "Milano",
      title: "Avere o essere?",
      gloss: "Pick the auxiliary",
      intro: [
        "Most verbs take avere: ho mangiato.",
        "Movement, change and staying take essere: sono andato.",
        "Quick test: can you ask \"what?\" → avere.",
      ],
      questionsPerRound: 12,
      build: auxQuestions,
    },
    {
      id: "pp-3-ausiliare",
      stop: "Venezia",
      title: "Ho, hai, ha… sono, sei, è…",
      gloss: "The auxiliary for each person",
      intro: ["avere: ho, hai, ha, abbiamo, avete, hanno", "essere: sono, sei, è, siamo, siete, sono"],
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
        "Plural: -i (or mixed group), -e (all female).",
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
      intro: ["Patterns help: -so / -sto (preso, chiesto), -tto (rotto), -to (scelto, vinto)."],
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
      id: "pp-9-boss",
      stop: "Palermo",
      title: "La sfida finale",
      gloss: "Everything, against the clock",
      intro: ["A bit of everything, plus two new twists:", "finire / passare can take either auxiliary.", "L'ho vista: lo, la, li, le make avere agree."],
      questionsPerRound: 15,
      timed: true,
      build: () => [
        ...shuffle(auxQuestions()).slice(0, 6),
        ...shuffle(agreementQuestions()).slice(0, 6),
        ...shuffle(participleQuestions([...irr1, ...irr2], "boss", true)).slice(0, 8),
        ...shuffle(reflexiveQuestions()).slice(0, 6),
        ...SENTENCES,
        ...BOSS_EXTRAS,
      ],
    },
  ],
};
