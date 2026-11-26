import "server-only";
import { getDb, schema } from "@/db";

/*
  The answer log: one row per answer, retries included.
  Logging must never cost a player their round, so failures are swallowed (and reported to the server log).
*/

const KINDS = ["choice", "type", "tiles"];
const VERDICTS = ["right", "accent", "wrong"];
const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

export async function recordAnswers(userId: string, topic: string, mode: "level" | "ripasso" | "sfida", raw: unknown, max: number) {
  if (!Array.isArray(raw)) return;
  const rows = raw.slice(0, max).flatMap((a) => {
    const skill = str(a?.skill, 120);
    if (!skill || !KINDS.includes(a?.kind) || !VERDICTS.includes(a?.verdict)) return [];
    const ms = Number.isInteger(a?.ms) && a.ms >= 0 && a.ms <= 600_000 ? (a.ms as number) : null;
    return [
      {
        id: crypto.randomUUID(),
        userId,
        topic,
        level: str(a?.level, 80),
        mode,
        skill,
        kind: a.kind as string,
        verdict: a.verdict as string,
        retry: a?.retry === true ? 1 : 0,
        ms,
      },
    ];
  });
  if (!rows.length) return;
  try {
    const db = await getDb();
    await db.insert(schema.answers).values(rows);
  } catch (e) {
    console.error("answer log:", (e as Error).message);
  }
}
