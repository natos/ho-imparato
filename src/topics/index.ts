import { passatoProssimo } from "./passato-prossimo";
import type { Topic } from "./types";

export const TOPICS: Record<string, Topic> = {
  [passatoProssimo.id]: passatoProssimo,
};

export const DEFAULT_TOPIC = passatoProssimo.id;

export function findLevel(topicId: string, levelId: string) {
  const topic = TOPICS[topicId];
  if (!topic) return null;
  const index = topic.levels.findIndex((l) => l.id === levelId);
  if (index < 0) return null;
  return { topic, level: topic.levels[index], index };
}
