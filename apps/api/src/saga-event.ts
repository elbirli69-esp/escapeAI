import type { SessionRecord } from "@escapeai/escape-engine";
import type { EventStore, StoredEvent } from "./event-store.js";
import { migrateLegacyEvent } from "./event-store.js";
import type { SessionStore } from "./session-store.js";
import { loadTeamMemberSessions } from "./asymmetric-team.js";

export function eventHasSagaTwoActs(event: StoredEvent): boolean {
  return Boolean(event.config.sagaTwoActs ?? event.room.sagaTwoActs);
}

export async function syncSagaAct2ReleasedToSessions(deps: {
  eventStore: EventStore;
  sessionStore: SessionStore;
  event: StoredEvent;
}): Promise<void> {
  if (!eventHasSagaTwoActs(deps.event) || !deps.event.sagaAct2Released) return;

  for (const team of Object.values(deps.event.teams)) {
    const sessions = await loadTeamMemberSessions(deps.event, team, deps.sessionStore);
    if (!sessions.length && team.sessionId) {
      const s = await deps.sessionStore.get(team.sessionId);
      if (s) sessions.push(s);
    }
    for (const session of sessions) {
      session.sagaAct2Released = true;
      await deps.sessionStore.set(session);
    }
  }
}

export async function refreshSagaOnSession(
  eventStore: EventStore,
  session: SessionRecord,
): Promise<void> {
  const ctx = session.playerContext;
  if (!ctx?.joinCode || !session.room.sagaTwoActs) return;
  const event = await eventStore.getByCode(ctx.joinCode);
  if (!event) return;
  const e = migrateLegacyEvent(event);
  session.sagaAct2Released = Boolean(e.sagaAct2Released);
}

export async function releaseSagaAct2(
  joinCode: string,
  eventStore: EventStore,
  sessionStore: SessionStore,
): Promise<{ status: number; body: unknown }> {
  const event = await eventStore.getByCode(joinCode);
  if (!event) return { status: 404, body: { error: "Evento no encontrado" } };
  const e = migrateLegacyEvent(event);
  if (!eventHasSagaTwoActs(e)) {
    return { status: 400, body: { error: "Este evento no tiene saga en dos actos." } };
  }
  if (e.sagaAct2Released) {
    return { status: 200, body: { sagaAct2Released: true } };
  }
  e.sagaAct2Released = true;
  await eventStore.save(e);
  await syncSagaAct2ReleasedToSessions({ eventStore, sessionStore, event: e });
  return { status: 200, body: { sagaAct2Released: true } };
}