import type { SessionRecord } from "@escapeai/escape-engine";
import type { GameAction, ApplyResult } from "@escapeai/shared";
import type { GameMasterService } from "./gamemaster/index.js";
import { snapshotExits, toOrchestratorShim } from "./gamemaster/index.js";
import { applyAction, toPublicState } from "@escapeai/escape-engine";
import type { SessionStore } from "./session-store.js";
import type { EventStore } from "./event-store.js";
import { syncPlayerStatusFromSession } from "./events-routes.js";

const GM_RESPONSE_BUDGET_MS = Number(process.env.GM_RESPONSE_BUDGET_MS ?? 3500);

/** Persiste el estado del engine y luego intenta GM dentro de un presupuesto de tiempo. */
export async function runGameplayAction(deps: {
  session: SessionRecord;
  action: GameAction;
  sessionStore: SessionStore;
  eventStore: EventStore;
  gm: GameMasterService;
}): Promise<ApplyResult> {
  const { session, action, sessionStore, eventStore, gm } = deps;
  const beforeExits = snapshotExits(session);
  const result = applyAction(session, action);

  await sessionStore.set(session);
  await syncPlayerStatusFromSession(eventStore, session);

  let interventions: Awaited<ReturnType<GameMasterService["processAfterAction"]>> = [];
  const gmWork = gm.processAfterAction({ session, action, events: result.events, beforeExits });

  try {
    interventions = await Promise.race([
      gmWork,
      new Promise<typeof interventions>((resolve) =>
        setTimeout(() => resolve([]), GM_RESPONSE_BUDGET_MS),
      ),
    ]);
  } catch {
    interventions = [];
  }

  if (interventions.length === 0) {
    void gmWork.catch(() => undefined);
  }

  const gmInterventions = await gm.listInterventions(session.sessionId);
  const latest = interventions[interventions.length - 1] ?? gmInterventions[gmInterventions.length - 1];

  return {
    ...result,
    state: toPublicState(session),
    interventions,
    gmInterventions,
    orchestrator: toOrchestratorShim(latest),
  };
}
