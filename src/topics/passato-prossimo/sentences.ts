import type { Question } from "../types";

/*
  Hand-written sentences for levels 7–8. Original to this project.
  Prompt format: the gap is "___", the clue in brackets is (subject, infinitive).
  ♂ / ♀ tell you the gender when the subject alone doesn't.
*/

const t = (id: string, prompt: string, answer: string, hint: string, explain: string, accept?: string[]): Question => ({
  kind: "type",
  id: `s-${id}`,
  prompt,
  hint,
  answer,
  accept,
  explain,
});

export const SENTENCES: Question[] = [
  t("film", "Ieri sera ___ un film italiano. (noi, guardare)", "abbiamo guardato", "Last night we watched an Italian film.", "guardare → avere: abbiamo guardato."),
  t("luca-uscito", "Stamattina Luca ___ alle sette. (uscire)", "è uscito", "This morning Luca went out at seven.", "uscire is movement → essere, agrees with Luca: uscito."),
  t("bologna", "La settimana scorsa Anna e Chiara ___ a Bologna. (andare)", "sono andate", "Last week Anna and Chiara went to Bologna.", "andare → essere. Two women → andate."),
  t("sicilia", "Due anni fa ___ in Sicilia. (io ♂, essere)", "sono stato", "Two years ago I was in Sicily.", "essere → sono stato (stata for a woman)."),
  t("colazione", "Stamattina non ___ colazione. (io, fare)", "ho fatto", "I didn't have breakfast this morning.", "Non goes before the auxiliary: non ho fatto."),
  t("bevuto", "Che cosa ___ ieri alla festa? (tu, bere)", "hai bevuto", "What did you drink at the party yesterday?", "bere → bevuto, with avere."),
  t("treno", "Il treno ___ in ritardo. (arrivare)", "è arrivato", "The train arrived late.", "arrivare → essere, agrees with il treno."),
  t("nata", "Mia sorella ___ nel 1998. (nascere)", "è nata", "My sister was born in 1998.", "nascere → essere, nato → nata."),
  t("passeggiata", "Dopo cena i ragazzi ___ una passeggiata. (fare)", "hanno fatto", "After dinner the boys went for a walk.", "fare una passeggiata → hanno fatto."),
  t("venuti", "Quando ___ in Italia? (voi ♂, venire)", "siete venuti", "When did you come to Italy?", "venire → essere, venuto → venuti.", ["siete venute"]),
  t("rimaste", "L'estate scorsa ___ al mare per due settimane. (noi ♀, rimanere)", "siamo rimaste", "Last summer we stayed at the seaside for two weeks.", "rimanere → essere, rimasto → rimaste."),
  t("letto", "Il mese scorso Paolo ___ un libro di Calvino. (leggere)", "ha letto", "Last month Paolo read a book by Calvino.", "leggere → letto, with avere."),
  t("pagato", "I nostri amici non ___ il conto. (pagare)", "hanno pagato", "Our friends didn't pay the bill.", "Non + hanno pagato."),
  t("cartolina", "Tre settimane fa ___ una cartolina ai nonni. (io, scrivere)", "ho scritto", "Three weeks ago I wrote a postcard to my grandparents.", "scrivere → scritto."),
  t("preso", "Oggi pomeriggio Giulia ___ il treno per Firenze. (prendere)", "ha preso", "This afternoon Giulia took the train to Florence.", "prendere → preso, with avere."),
  t("chiuso", "Perché ___ la finestra? (tu, chiudere)", "hai chiuso", "Why did you close the window?", "chiudere → chiuso."),
  t("tornati", "I miei genitori ___ dalla Spagna ieri sera. (tornare)", "sono tornati", "My parents came back from Spain last night.", "tornare → essere, plural → tornati."),
  t("visto", "Non ___ Venezia. (noi, mai + vedere)", "abbiamo mai visto", "We have never seen Venice.", "mai goes between auxiliary and participle: non abbiamo mai visto.", ["abbiamo mai veduto"]),
  t("detto", "Che cosa ti ___ tuo fratello? (dire)", "ha detto", "What did your brother tell you?", "dire → detto."),
  t("stata", "Ieri Giulia ___ a casa tutto il giorno. (stare)", "è stata", "Yesterday Giulia stayed home all day.", "stare → essere, stato → stata."),
];

const tiles = (id: string, prompt: string, answer: string[], distractors: string[], explain: string): Question => ({
  kind: "tiles",
  id: `tiles-${id}`,
  prompt,
  tiles: [...answer, ...distractors],
  answer,
  explain,
});

export const TILES: Question[] = [
  tiles("mare", "We (♂) went to the seaside.", ["Siamo", "andati", "al", "mare"], ["abbiamo", "andato"], "andare → essere; noi ♂ → andati."),
  tiles("dormito", "I didn't sleep well.", ["Non", "ho", "dormito", "bene"], ["sono", "dormita"], "dormire → avere. Non before the auxiliary."),
  tiles("marta", "Marta came back yesterday.", ["Marta", "è", "tornata", "ieri"], ["ha", "tornato"], "tornare → essere, agrees with Marta."),
  tiles("trevi", "Did you see the Trevi Fountain?", ["Hai", "visto", "la", "Fontana", "di", "Trevi"], ["sei", "veduto"], "vedere → visto, with avere."),
  tiles("mezzanotte", "They (♀) arrived at midnight.", ["Sono", "arrivate", "a", "mezzanotte"], ["hanno", "arrivati"], "arrivare → essere; all female → arrivate."),
  tiles("cannolo", "I ate a cannolo in Palermo.", ["Ho", "mangiato", "un", "cannolo", "a", "Palermo"], ["sono", "mangiata"], "mangiare → avere: stays -o."),
];

const c = (id: string, prompt: string, options: string[], answer: string, explain: string, hint?: string): Question => ({
  kind: "choice",
  id: `boss-${id}`,
  prompt,
  hint,
  options,
  answer,
  explain,
});

/** Boss-only twists: verbs that take either auxiliary, and lo/la/li/le agreement. */
export const BOSS_EXTRAS: Question[] = [
  // either auxiliary: object → avere, no object → essere
  c("finita", "La lezione ___ finita alle otto.", ["è", "ha"], "è", "No object → essere: la lezione è finita."),
  c("finito", "(Io) ___ finito il lavoro alle sei.", ["Ho", "Sono"], "Ho", "Object (il lavoro) → avere: ho finito."),
  c("cominciato", "Il film ___ cominciato tardi.", ["è", "ha"], "è", "No object → essere."),
  c("passato", "(Noi) ___ passato le vacanze in Puglia.", ["Abbiamo", "Siamo"], "Abbiamo", "Object (le vacanze) → avere."),
  c("salito", "Marco ___ salito sul treno.", ["è", "ha"], "è", "salire sul treno, no object → essere."),
  c("corso", "Ieri (io) ___ corso cinque chilometri.", ["ho", "sono"], "ho", "Object (cinque chilometri) → avere."),
  // direct-object pronouns make avere agree
  c("pizza", "Hai mangiato la pizza? – Sì, l'ho ___.", ["mangiato", "mangiata", "mangiati", "mangiate"], "mangiata", "la pizza → l'ho mangiata."),
  c("biglietti", "Hai comprato i biglietti? – Sì, li ho ___.", ["comprato", "comprata", "comprati", "comprate"], "comprati", "i biglietti → li ho comprati."),
  c("foto", "Hai visto le foto? – Sì, le ho ___.", ["visto", "vista", "visti", "viste"], "viste", "le foto → le ho viste."),
  c("giornale", "Hai letto il giornale? – Sì, l'ho ___.", ["letto", "letta", "letti", "lette"], "letto", "il giornale → l'ho letto."),
];
