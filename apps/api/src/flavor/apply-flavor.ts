import type { RoomDefinition } from "@escapeai/escape-engine";
import { collectRoomSecrets, isFlavorTextSafe } from "./validate-flavor.js";

export type FlavorRewriteFn = (
  field: "description" | "mood" | "tagline" | "name",
  text: string,
  context: { sceneId?: string },
) => string;

function pickSafe(candidate: string, fallback: string, secrets: string[]): string {
  return isFlavorTextSafe(candidate, secrets) ? candidate : fallback;
}

/**
 * Post-proceso determinista tras generateAdventureRoom: reescritura opcional (p. ej. LLM)
 * con validación que revierte al texto original si filtra soluciones.
 */
export function applyValidatedFlavor(
  room: RoomDefinition,
  opts?: { rewrite?: FlavorRewriteFn },
): RoomDefinition {
  const secrets = collectRoomSecrets(room);
  const next: RoomDefinition = structuredClone(room);

  const rewrite = opts?.rewrite;
  if (rewrite && next.tagline) {
    const candidate = rewrite("tagline", next.tagline, {});
    next.tagline = pickSafe(candidate, next.tagline, secrets);
  }
  if (rewrite && next.name) {
    const candidate = rewrite("name", next.name, {});
    next.name = pickSafe(candidate, next.name, secrets);
  }

  for (const [sceneId, scene] of Object.entries(next.scenes)) {
    if (rewrite) {
      const desc = rewrite("description", scene.description, { sceneId });
      scene.description = pickSafe(desc, scene.description, secrets);
      if (scene.mood) {
        const mood = rewrite("mood", scene.mood, { sceneId });
        scene.mood = pickSafe(mood, scene.mood, secrets);
      }
    } else {
      scene.description = pickSafe(scene.description, scene.description, secrets);
      if (scene.mood) scene.mood = pickSafe(scene.mood, scene.mood!, secrets);
    }
  }

  return next;
}
