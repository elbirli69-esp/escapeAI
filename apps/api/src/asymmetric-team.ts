import type { SessionRecord } from "@escapeai/escape-engine";
import { isPlayerRoleId, type PlayerRoleId } from "@escapeai/shared";

const ASYMMETRIC_PLAYER_ROLES = ["researcher", "field"] as const satisfies readonly PlayerRoleId[];
import type { EventStore, StoredEvent, StoredTeam, StoredTeamMember } from "./event-store.js";
import type { SessionStore } from "./session-store.js";

export function eventHasAsymmetricRoles(event: StoredEvent): boolean {
  return Boolean(event.config.asymmetricRoles);
}

export function assignPlayerRole(
  team: StoredTeam,
  requested?: PlayerRoleId,
): PlayerRoleId | undefined {
  const members = Object.values(team.members ?? {});
  const used = new Set(members.map((m) => m.role));
  if (requested && isPlayerRoleId(requested) && !used.has(requested)) return requested;
  for (const role of ASYMMETRIC_PLAYER_ROLES) {
    if (!used.has(role)) return role;
  }
  return undefined;
}

export function findTeamByName(event: StoredEvent, teamName: string): StoredTeam | undefined {
  const norm = teamName.trim().toLowerCase();
  return Object.values(event.teams).find((t) => t.teamName.trim().toLowerCase() === norm);
}

function mergedTeamClues(sessions: SessionRecord[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const s of sessions) {
    for (const [id, text] of s.grantedClues) {
      merged.set(id, text);
    }
  }
  return merged;
}

export async function loadTeamMemberSessions(
  _event: StoredEvent,
  team: StoredTeam,
  sessionStore: SessionStore,
): Promise<SessionRecord[]> {
  const sessions: SessionRecord[] = [];
  for (const member of Object.values(team.members ?? {})) {
    if (!member.sessionId) continue;
    const s = await sessionStore.get(member.sessionId);
    if (s) sessions.push(s);
  }
  if (!sessions.length && team.sessionId) {
    const legacy = await sessionStore.get(team.sessionId);
    if (legacy) sessions.push(legacy);
  }
  return sessions;
}

/** Propaga pistas del equipo y victoria compartida tras una acción. */
export async function syncAsymmetricTeamAfterAction(deps: {
  eventStore: EventStore;
  sessionStore: SessionStore;
  session: SessionRecord;
}): Promise<void> {
  const ctx = deps.session.playerContext;
  if (!ctx?.joinCode || !ctx.playerRole || !ctx.teamId) return;

  const event = await deps.eventStore.getByCode(ctx.joinCode);
  if (!event || !eventHasAsymmetricRoles(event)) return;

  const team = event.teams[ctx.teamId];
  if (!team) return;

  const sessions = await loadTeamMemberSessions(event, team, deps.sessionStore);
  if (sessions.length === 0) return;

  const clues = mergedTeamClues(sessions);
  const someoneWon = sessions.some((s) => s.status === "won");

  for (const s of sessions) {
    s.teamGrantedClues = new Map(
      [...clues.entries()].filter(([id]) => !s.grantedClues.has(id)),
    );
    if (someoneWon && s.status === "playing") {
      s.status = "won";
      s.narrative.push("¡Victoria del equipo! Todos los roles completaron el reto.");
    }
    await deps.sessionStore.set(s);
  }

  if (someoneWon) team.status = "won";
  team.puzzlesSolved = Math.max(
    team.puzzlesSolved ?? 0,
    ...sessions.map((s) => s.solvedPuzzles.size),
  );
  await deps.eventStore.save(event);
}

export function upsertTeamMember(
  team: StoredTeam,
  memberId: string,
  patch: Partial<StoredTeamMember>,
): StoredTeamMember {
  team.members = team.members ?? {};
  const prev = team.members[memberId];
  const next: StoredTeamMember = {
    memberId,
    displayName: patch.displayName ?? prev?.displayName ?? team.teamName,
    role: patch.role ?? prev?.role ?? "researcher",
    sessionId: patch.sessionId ?? prev?.sessionId,
    joinedAtMs: prev?.joinedAtMs ?? Date.now(),
  };
  team.members[memberId] = next;
  return next;
}

export function countTeamMembers(team: StoredTeam): number {
  return Object.keys(team.members ?? {}).length;
}