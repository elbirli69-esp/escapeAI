import type { CreateEventRequest, EventTeamVariablePublic } from "@escapeai/shared";
import { resolveTeamCount } from "@escapeai/shared";
import type { SessionRecord } from "@escapeai/escape-engine";
import type { EventStore, StoredEvent, StoredTeamVariable } from "./event-store.js";
import { migrateLegacyEvent } from "./event-store.js";

export type TeamVariableConfig = {
  label: string;
  goal: number;
  puzzleId: string;
};

export function resolveTeamVariableConfig(body: CreateEventRequest): TeamVariableConfig | undefined {
  if (body.teamVariable === false) return undefined;
  const teamCount = resolveTeamCount(body);
  const custom = typeof body.teamVariable === "object" ? body.teamVariable : undefined;
  const enabled = custom?.enabled ?? (body.adventureType === "team" || body.adventureType === "celebration");
  if (!enabled || teamCount < 2) return undefined;

  const goal = Math.min(teamCount, Math.max(2, custom?.goal ?? 3));
  return {
    label: custom?.label ?? "Equipos que abrieron el candado inicial",
    goal,
    puzzleId: custom?.puzzleId ?? "entry_lock",
  };
}

export function initTeamVariable(config: TeamVariableConfig): StoredTeamVariable {
  return { ...config, value: 0, contributedTeamIds: [] };
}

export function teamVariableToPublic(state: StoredTeamVariable): EventTeamVariablePublic {
  return {
    label: state.label,
    goal: state.goal,
    value: state.value,
    puzzleId: state.puzzleId,
  };
}

export function applyTeamVariableBump(
  event: StoredEvent,
  teamId: string,
  puzzleId: string,
): StoredEvent | undefined {
  const tv = event.teamVariable;
  if (!tv || puzzleId !== tv.puzzleId) return undefined;
  if (tv.contributedTeamIds.includes(teamId)) return undefined;

  const next: StoredTeamVariable = {
    ...tv,
    value: tv.value + 1,
    contributedTeamIds: [...tv.contributedTeamIds, teamId],
  };
  return { ...event, teamVariable: next };
}

export function attachTeamProgressToSession(session: SessionRecord, event: StoredEvent): void {
  const tv = migrateLegacyEvent(event).teamVariable;
  if (!tv) {
    delete session.teamProgress;
    return;
  }
  session.teamProgress = {
    label: tv.label,
    value: tv.value,
    goal: tv.goal,
  };
}

export async function refreshSessionTeamProgress(
  eventStore: EventStore,
  session: SessionRecord,
): Promise<void> {
  const ctx = session.playerContext;
  if (!ctx?.joinCode) return;
  const event = await eventStore.getByCode(ctx.joinCode);
  if (!event) return;
  attachTeamProgressToSession(session, event);
}

export async function onPuzzleSolvedForTeamVariable(deps: {
  eventStore: EventStore;
  session: SessionRecord;
  puzzleId: string;
}): Promise<void> {
  const ctx = deps.session.playerContext;
  if (!ctx?.joinCode || !ctx.playerId) return;
  const raw = await deps.eventStore.getByCode(ctx.joinCode);
  if (!raw) return;
  const e = migrateLegacyEvent(raw);
  const team = e.teams[ctx.playerId];
  if (!team || team.sessionId !== deps.session.sessionId) return;

  const bumped = applyTeamVariableBump(e, ctx.playerId, deps.puzzleId);
  if (!bumped) return;
  await deps.eventStore.save(bumped);
  attachTeamProgressToSession(deps.session, bumped);

  if (
    bumped.teamVariable &&
    bumped.teamVariable.value >= bumped.teamVariable.goal &&
    !deps.session.narrative.some((l) => l.includes("Candado comunitario"))
  ) {
    deps.session.narrative.push(
      `— Candado comunitario — ${bumped.teamVariable.value}/${bumped.teamVariable.goal} equipos listos.`,
    );
  }
}
