import type { RoomDefinition } from "@escapeai/escape-engine";
import type { EventSceneMilestone } from "@escapeai/shared";
import type { StoredEvent, StoredTeam } from "./event-store.js";
import { migrateLegacyEvent } from "./event-store.js";

/** Orden jugable de escenas (BFS desde start). */
export function orderedSceneIds(room: RoomDefinition): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  const queue = [room.startSceneId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    const scene = room.scenes[id];
    for (const exit of scene?.exits ?? []) {
      if (!seen.has(exit.toSceneId)) queue.push(exit.toSceneId);
    }
  }
  for (const id of Object.keys(room.scenes)) {
    if (!seen.has(id)) order.push(id);
  }
  return order;
}

export function computeSceneProgress(event: StoredEvent): {
  sceneMilestones: EventSceneMilestone[];
  progressSummary?: string;
} {
  const e = migrateLegacyEvent(event);
  const order = orderedSceneIds(e.room);
  const sceneNumber = new Map(order.map((id, i) => [id, i + 1]));
  const counts = new Map<string, number>();

  for (const team of Object.values(e.teams)) {
    if (team.status !== "playing" || !team.currentSceneId) continue;
    const id = team.currentSceneId;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const sceneMilestones: EventSceneMilestone[] = order
    .map((sceneId) => {
      const teamsCount = counts.get(sceneId) ?? 0;
      return {
        sceneId,
        sceneTitle: e.room.scenes[sceneId]?.title ?? sceneId,
        sceneNumber: sceneNumber.get(sceneId) ?? 0,
        teamsCount,
      };
    })
    .filter((row) => row.teamsCount > 0);

  const parts = sceneMilestones.map((m) => {
    const n = m.teamsCount;
    const label = n === 1 ? "1 equipo" : `${n} equipos`;
    const act =
      e.config.sagaTwoActs && m.sceneId === "finale_b"
        ? " · Acto 2"
        : e.config.sagaTwoActs && m.sceneId === "finale"
          ? " · Acto 1"
          : "";
    return `${label} en escena ${m.sceneNumber} («${m.sceneTitle}»)${act}`;
  });

  const sagaPrefix =
    e.config.sagaTwoActs && !e.sagaAct2Released
      ? "Saga: acto 2 aún no liberado por organizador · "
      : e.config.sagaTwoActs && e.sagaAct2Released
        ? "Saga: acto 2 en juego · "
        : "";

  return {
    sceneMilestones,
    progressSummary:
      parts.length > 0 ? `${sagaPrefix}${parts.join(" · ")}` : sagaPrefix || undefined,
  };
}

export function teamSceneFields(
  sessionSceneId: string,
  room: RoomDefinition,
): Pick<StoredTeam, "currentSceneId" | "currentSceneTitle"> {
  return {
    currentSceneId: sessionSceneId,
    currentSceneTitle: room.scenes[sessionSceneId]?.title ?? sessionSceneId,
  };
}
