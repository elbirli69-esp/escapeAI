/**
 * @deprecated Usar GameMasterService (`./gamemaster`). Se mantiene por compatibilidad de importación.
 */
import type { SessionRecord } from "@escapeai/escape-engine";
import type { GameEvent } from "@escapeai/shared";
import { createGmInterventionStore, GameMasterService } from "./gamemaster/index.js";
import { staticInterventionText } from "./gamemaster/fallbacks.js";
import { sessionStartedTrigger } from "./gamemaster/triggers.js";

export type OrchestratorSource = "fallback" | "openai" | "deepseek";

export type OrchestratorResult = {
  message: string;
  source: OrchestratorSource;
};

export async function runOrchestrator(
  session: SessionRecord,
  events: GameEvent[],
): Promise<OrchestratorResult> {
  const store = await createGmInterventionStore();
  const gm = new GameMasterService(store);
  if (events.length === 0) {
    const items = await gm.processSessionStarted(session);
    const last = items[items.length - 1];
    if (!last) {
      const pack = staticInterventionText(session, sessionStartedTrigger());
      return { message: pack.text, source: "fallback" };
    }
    return {
      message: last.text,
      source: last.meta.provider === "static" ? "fallback" : last.meta.provider,
    };
  }
  const pack = staticInterventionText(session, {
    type: "SCENE_ENTERED",
    sourceEventId: "legacy",
    payload: { sceneId: session.currentSceneId },
  });
  return { message: pack.text, source: "fallback" };
}
