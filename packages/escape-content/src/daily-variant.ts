import type { RoomDefinition } from "@escapeai/escape-engine";
import { dailyPlaySeed, stableHash32 } from "./play-seed.js";

const MOOD_VARIANTS = ["contemplativo", "tenso", "esperanzado", "misterioso", "íntimo"] as const;
const TIME_TUNINGS_SEC = [0, -180, 180, 300, -300, 420, -240];

/**
 * Variante diaria suave para salas de catálogo: ritmo y mood, sin tocar respuestas.
 */
export function applyCatalogDailyVariant(
  room: RoomDefinition,
  roomId: string,
  at: Date = new Date(),
): RoomDefinition {
  const seed = dailyPlaySeed(`catalog:${roomId}`, at);
  const hash = stableHash32(seed);
  const next = structuredClone(room);
  const delta = TIME_TUNINGS_SEC[hash % TIME_TUNINGS_SEC.length] ?? 0;
  next.timeLimitSec = Math.max(900, next.timeLimitSec + delta);

  const start = next.scenes[next.startSceneId];
  if (start?.mood) {
    start.mood = MOOD_VARIANTS[hash % MOOD_VARIANTS.length] ?? start.mood;
  }

  const taglineSuffix =
    hash % 3 === 0 ? " (edición del día)" : hash % 3 === 1 ? " — variante de hoy" : "";
  if (next.tagline && taglineSuffix && !next.tagline.includes("variante")) {
    next.tagline = `${next.tagline}${taglineSuffix}`;
  }

  return next;
}
