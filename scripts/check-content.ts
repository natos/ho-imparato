// Validates every topic pack and prints a sample round per level for review.
// Usage: npx tsx scripts/check-content.ts [--all]
import { passatoProssimo } from "../src/topics/passato-prossimo";
import type { Question } from "../src/topics/types";

const showAll = process.argv.includes("--all");
let problems = 0;
const fail = (msg: string) => {
  problems++;
  console.log(`  ✗ ${msg}`);
};

function render(q: Question) {
  if (q.kind === "choice") return `${q.prompt}  [${q.options.join(" | ")}] → ${q.answer}`;
  if (q.kind === "type") return `${q.prompt}  → ${q.answer}${q.accept ? ` (also: ${q.accept.join(", ")})` : ""}`;
  return `"${q.prompt}"  → ${q.answer.join(" ")}   (extra tiles: ${q.tiles.filter((t) => !q.answer.includes(t)).join(", ")})`;
}

for (const level of passatoProssimo.levels) {
  const pool = level.build();
  console.log(`\n■ ${level.stop} — ${level.title} (${level.gloss}) · pool ${pool.length}`);

  if (pool.length < level.questionsPerRound) fail(`pool smaller than a round (${level.questionsPerRound})`);
  const ids = new Set<string>();
  for (const q of pool) {
    if (ids.has(q.id) && level.id !== "pp-9-boss") fail(`duplicate id ${q.id}`);
    ids.add(q.id);
    if (q.kind === "choice") {
      if (!q.options.includes(q.answer)) fail(`answer not in options: ${q.id}`);
      if (new Set(q.options).size !== q.options.length) fail(`duplicate options: ${q.id} ${q.options}`);
      if (q.options.length < 2) fail(`too few options: ${q.id}`);
    }
    if (q.kind === "tiles" && !q.answer.every((w) => q.tiles.includes(w))) fail(`tiles missing answer word: ${q.id}`);
    if ((q.kind === "choice" || q.kind === "type") && !q.prompt.includes("___") && !q.id.startsWith("aux-") && !q.id.includes("-choice-"))
      fail(`no gap in prompt: ${q.id}`);
    if (!q.explain) fail(`missing explanation: ${q.id}`);
  }

  const sample = showAll ? pool : [...pool].sort(() => Math.random() - 0.5).slice(0, 6);
  for (const q of sample) console.log(`  · ${render(q)}`);
}

console.log(problems ? `\n${problems} problem(s)` : "\nAll checks passed.");
process.exit(problems ? 1 : 0);
