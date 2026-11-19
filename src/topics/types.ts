/**
 * Topic pack contract. A topic (passato prossimo, numbers, …) is data + optional
 * generators; the game engine knows nothing about Italian grammar.
 */

/** What the player has to do, in one plain sentence. Shown above every prompt. */
type Base = { task: string };

/** One question as the engine sees it. */
export type Question = Base & (
  | {
      kind: "choice"; // tap one of 2–4 options (avere/essere is a 2-option choice)
      id: string;
      prompt: string; // Italian, may contain "___" for the gap
      hint?: string; // English gloss, shown small
      options: string[];
      answer: string;
      explain: string; // shown after answering — the rule, in one line
    }
  | {
      kind: "type"; // type the missing word(s)
      id: string;
      prompt: string;
      hint?: string;
      answer: string; // canonical answer
      accept?: string[]; // other correct answers
      explain: string;
    }
  | {
      kind: "tiles"; // tap words in order to build the sentence
      id: string;
      prompt: string; // English meaning
      tiles: string[]; // shuffled by the engine; may include distractors
      answer: string[]; // correct order
      explain: string;
    });

export type Level = {
  id: string; // stable — progress rows reference it
  stop: string; // city on the route
  title: string; // the rule, in Italian
  gloss: string; // the rule, in English
  intro: string[]; // 2–4 short lines shown before the first round
  questionsPerRound: number;
  timed?: boolean; // boss level
  build: () => Question[]; // full pool; the engine samples a round from it
};

export type Topic = {
  id: string;
  title: string;
  levels: Level[];
};
