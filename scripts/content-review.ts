// Writes a human-readable review of the passato prossimo pack: npm run content:review > CONTENT-REVIEW.md
import { passatoProssimo } from "../src/topics/passato-prossimo";
import { REFLEXIVES, VERBS } from "../src/topics/passato-prossimo/verbs";
import { SENTENCES, TILES, EITHER_AUX, PRONOUN_AGREEMENT } from "../src/topics/passato-prossimo/sentences";
import type { Question } from "../src/topics/types";
const r = (q: Question) => q.kind === "choice" ? `${q.prompt} — options: ${q.options.join(" / ")} → **${q.answer}**`
  : q.kind === "type" ? `${q.prompt} → **${q.answer}**${q.accept ? ` (also accepted: ${q.accept.join(", ")})` : ""} _${q.hint ?? ""}_`
  : `"${q.prompt}" → **${q.answer.join(" ")}** (decoy tiles: ${q.tiles.filter(t => !q.answer.includes(t)).join(", ")})`;
const L: string[] = [];
L.push("# Passato prossimo: content review\n");
L.push("Check the Italian and tick anything that's wrong or unnatural. Levels 1–6 are generated from the verb table, so fixing a verb fixes every question that uses it. Levels 7–8 are written by hand.\n");
L.push("## Level plan\n\n| # | Stop | Rule | Round |\n|---|---|---|---|");
passatoProssimo.levels.forEach((l, i) => L.push(`| ${i + 1} | ${l.stop} | **${l.title}** (${l.gloss}) | ${l.questionsPerRound} questions${l.timed ? ", timed" : ""} · pool ${l.build().length} |`));
L.push("\n## Verb table (80 verbs)\n\n| Infinitive | Participle | Auxiliary | English | Set |\n|---|---|---|---|---|");
for (const v of VERBS) L.push(`| ${v.inf} | ${v.pp} | ${v.aux} | ${v.en} | ${v.set} |`);
L.push(`\n## Reflexive verbs (${REFLEXIVES.length}, level 7 · Roma)\n\n| Infinitive | Participle | English | Example ending |\n|---|---|---|---|`);
for (const r of REFLEXIVES) L.push(`| ${r.inf} | ${r.pp} | ${r.en} | ${r.rest ?? ""} |`);
L.push("\n## Level 8 (Napoli): sentences, all of them\n");
SENTENCES.forEach((q, i) => L.push(`${i + 1}. ${r(q)}`));
L.push("\n### Sentence building (tiles)\n");
TILES.forEach((q, i) => L.push(`${i + 1}. ${r(q)}`));
L.push("\n## Bari: either auxiliary, all of them\n");
EITHER_AUX.forEach((q, i) => L.push(`${i + 1}. ${r(q)}`));
L.push("\n### Bari bonus: lo, la, li, le agreement\n");
PRONOUN_AGREEMENT.forEach((q, i) => L.push(`${i + 1}. ${r(q)}`));
L.push("\n## Sample generated questions (levels 1–7)\n");
for (const l of passatoProssimo.levels.filter((l) => !["pp-8-frasi", "pp-8b-due-ausiliari", "pp-9-boss"].includes(l.id))) {
  L.push(`\n### ${l.stop}: ${l.title}\n`);
  [...l.build()].sort(() => Math.random() - 0.5).slice(0, 8).forEach(q => L.push(`- ${r(q)}`));
}
console.log(L.join("\n"));
