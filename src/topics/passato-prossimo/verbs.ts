/**
 * Verb table for the passato prossimo pack. Every question in levels 1–6 is
 * generated from these rows, so each fact lives in exactly one place.
 *
 * Scope follows our A1 course (lessons 7–8): regular participles, avere vs
 * essere, agreement with essere, and the irregular participles we were given.
 * Sentences and examples are original to this project.
 */

export type Aux = "avere" | "essere" | "entrambi";

export type Verb = {
  inf: string;
  pp: string; // masculine singular participle
  aux: Aux; // "entrambi" = depends on the sentence; never used in the plain avere/essere drill
  en: string;
  set: "regolare" | "irregolare-1" | "irregolare-2";
};

const v = (inf: string, pp: string, aux: Aux, en: string, set: Verb["set"]): Verb => ({ inf, pp, aux, en, set });

export const VERBS: Verb[] = [
  // ── Regular, avere ───────────────────────────────────────────────
  v("parlare", "parlato", "avere", "to speak", "regolare"),
  v("mangiare", "mangiato", "avere", "to eat", "regolare"),
  v("comprare", "comprato", "avere", "to buy", "regolare"),
  v("visitare", "visitato", "avere", "to visit", "regolare"),
  v("lavorare", "lavorato", "avere", "to work", "regolare"),
  v("studiare", "studiato", "avere", "to study", "regolare"),
  v("ascoltare", "ascoltato", "avere", "to listen", "regolare"),
  v("abitare", "abitato", "avere", "to live (somewhere)", "regolare"),
  v("preparare", "preparato", "avere", "to prepare", "regolare"),
  v("giocare", "giocato", "avere", "to play", "regolare"),
  v("cucinare", "cucinato", "avere", "to cook", "regolare"),
  v("pagare", "pagato", "avere", "to pay", "regolare"),
  v("cercare", "cercato", "avere", "to look for", "regolare"),
  v("guardare", "guardato", "avere", "to watch", "regolare"),
  v("prenotare", "prenotato", "avere", "to book", "regolare"),
  v("telefonare", "telefonato", "avere", "to phone", "regolare"),
  v("viaggiare", "viaggiato", "avere", "to travel", "regolare"),
  v("camminare", "camminato", "avere", "to walk", "regolare"),
  v("domandare", "domandato", "avere", "to ask", "regolare"),
  v("portare", "portato", "avere", "to bring", "regolare"),
  v("credere", "creduto", "avere", "to believe", "regolare"),
  v("ricevere", "ricevuto", "avere", "to receive", "regolare"),
  v("vendere", "venduto", "avere", "to sell", "regolare"),
  v("ripetere", "ripetuto", "avere", "to repeat", "regolare"),
  v("avere", "avuto", "avere", "to have", "regolare"),
  v("dormire", "dormito", "avere", "to sleep", "regolare"),
  v("sentire", "sentito", "avere", "to hear", "regolare"),
  v("capire", "capito", "avere", "to understand", "regolare"),
  v("pulire", "pulito", "avere", "to clean", "regolare"),

  // ── Regular, essere ──────────────────────────────────────────────
  v("andare", "andato", "essere", "to go", "regolare"),
  v("arrivare", "arrivato", "essere", "to arrive", "regolare"),
  v("entrare", "entrato", "essere", "to enter", "regolare"),
  v("tornare", "tornato", "essere", "to come back", "regolare"),
  v("uscire", "uscito", "essere", "to go out", "regolare"),
  v("partire", "partito", "essere", "to leave", "regolare"),
  v("stare", "stato", "essere", "to stay / to be", "regolare"),
  v("restare", "restato", "essere", "to stay", "regolare"),
  v("diventare", "diventato", "essere", "to become", "regolare"),
  v("cadere", "caduto", "essere", "to fall", "regolare"),

  // ── Regular, either auxiliary (depends on the sentence) ──────────
  v("finire", "finito", "entrambi", "to finish", "regolare"),
  v("cominciare", "cominciato", "entrambi", "to start", "regolare"),
  v("passare", "passato", "entrambi", "to spend (time) / to pass", "regolare"),
  v("cambiare", "cambiato", "entrambi", "to change", "regolare"),
  v("salire", "salito", "entrambi", "to go up / to get on", "regolare"),

  // ── Irregular participles, set 1 (lesson 7 list) ─────────────────
  v("aprire", "aperto", "avere", "to open", "irregolare-1"),
  v("bere", "bevuto", "avere", "to drink", "irregolare-1"),
  v("chiedere", "chiesto", "avere", "to ask", "irregolare-1"),
  v("chiudere", "chiuso", "avere", "to close", "irregolare-1"),
  v("dire", "detto", "avere", "to say", "irregolare-1"),
  v("essere", "stato", "essere", "to be", "irregolare-1"),
  v("fare", "fatto", "avere", "to do / to make", "irregolare-1"),
  v("leggere", "letto", "avere", "to read", "irregolare-1"),
  v("mettere", "messo", "avere", "to put", "irregolare-1"),
  v("nascere", "nato", "essere", "to be born", "irregolare-1"),
  v("perdere", "perso", "avere", "to lose", "irregolare-1"),
  v("prendere", "preso", "avere", "to take", "irregolare-1"),
  v("rimanere", "rimasto", "essere", "to stay / to remain", "irregolare-1"),
  v("scrivere", "scritto", "avere", "to write", "irregolare-1"),
  v("vedere", "visto", "avere", "to see", "irregolare-1"),
  v("venire", "venuto", "essere", "to come", "irregolare-1"),

  // ── Irregular participles, set 2 (extra list) ────────────────────
  v("accendere", "acceso", "avere", "to switch on", "irregolare-2"),
  v("decidere", "deciso", "avere", "to decide", "irregolare-2"),
  v("dipingere", "dipinto", "avere", "to paint", "irregolare-2"),
  v("rispondere", "risposto", "avere", "to answer", "irregolare-2"),
  v("rompere", "rotto", "avere", "to break", "irregolare-2"),
  v("scegliere", "scelto", "avere", "to choose", "irregolare-2"),
  v("spendere", "speso", "avere", "to spend (money)", "irregolare-2"),
  v("spegnere", "spento", "avere", "to switch off", "irregolare-2"),
  v("togliere", "tolto", "avere", "to take off / remove", "irregolare-2"),
  v("vincere", "vinto", "avere", "to win", "irregolare-2"),
  v("offrire", "offerto", "avere", "to offer", "irregolare-2"),
  v("piangere", "pianto", "avere", "to cry", "irregolare-2"),
  v("ridere", "riso", "avere", "to laugh", "irregolare-2"),
  v("nascondere", "nascosto", "avere", "to hide", "irregolare-2"),
  v("morire", "morto", "essere", "to die", "irregolare-2"),
  v("correre", "corso", "entrambi", "to run", "irregolare-2"),
  v("vivere", "vissuto", "entrambi", "to live", "irregolare-2"),
  v("scendere", "sceso", "entrambi", "to go down / to get off", "irregolare-2"),
];

// ── Auxiliaries in the present ───────────────────────────────────────

export type Person = "io" | "tu" | "lui" | "lei" | "noi" | "voi" | "loro";

export const AVERE: Record<Person, string> = {
  io: "ho", tu: "hai", lui: "ha", lei: "ha", noi: "abbiamo", voi: "avete", loro: "hanno",
};
export const ESSERE: Record<Person, string> = {
  io: "sono", tu: "sei", lui: "è", lei: "è", noi: "siamo", voi: "siete", loro: "sono",
};

/** Participle agreement with essere: -o / -a / -i / -e. */
export function agree(pp: string, gender: "m" | "f", plural: boolean) {
  const stem = pp.slice(0, -1);
  return stem + (plural ? (gender === "m" ? "i" : "e") : gender === "m" ? "o" : "a");
}

// ── Reflexive verbs: always essere, pronoun before the auxiliary ─────

export type Reflexive = { inf: string; pp: string; en: string; rest?: string };

export const REFLEXIVES: Reflexive[] = [
  { inf: "svegliarsi", pp: "svegliato", en: "to wake up", rest: "alle sette" },
  { inf: "alzarsi", pp: "alzato", en: "to get up", rest: "presto" },
  { inf: "lavarsi", pp: "lavato", en: "to wash (oneself)", rest: "con l'acqua fredda" },
  { inf: "vestirsi", pp: "vestito", en: "to get dressed", rest: "in fretta" },
  { inf: "divertirsi", pp: "divertito", en: "to have fun", rest: "alla festa" },
  { inf: "riposarsi", pp: "riposato", en: "to rest", rest: "dopo pranzo" },
  { inf: "addormentarsi", pp: "addormentato", en: "to fall asleep", rest: "sul divano" },
  { inf: "prepararsi", pp: "preparato", en: "to get ready", rest: "per la cena" },
  { inf: "fermarsi", pp: "fermato", en: "to stop", rest: "a Siena" },
  { inf: "sposarsi", pp: "sposato", en: "to get married", rest: "nel 2015" },
  { inf: "trovarsi", pp: "trovato", en: "to like it / feel at home (trovarsi bene)", rest: "bene a Roma" },
  { inf: "sedersi", pp: "seduto", en: "to sit down", rest: "a tavola" },
  // No reflexives with a direct object (mettersi il cappello): there the participle may agree with the object — A2.
  { inf: "pettinarsi", pp: "pettinato", en: "to comb one's hair", rest: "davanti allo specchio" },
  { inf: "truccarsi", pp: "truccato", en: "to put on make-up", rest: "per la festa" },
];

export const REFLEXIVE_PRONOUN: Record<Person, string> = {
  io: "mi", tu: "ti", lui: "si", lei: "si", noi: "ci", voi: "vi", loro: "si",
};
