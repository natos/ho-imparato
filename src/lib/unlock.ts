import type { Topic } from "@/topics/types";

/** A level is playable when it's the first one, or the one before it has at least 1 star. */
export function isUnlocked(topic: Topic, index: number, stars: Record<string, number>) {
  return index === 0 || (stars[topic.levels[index - 1]?.id] ?? 0) > 0;
}
