import type { RoomCharacter, SessionRecord } from "@escapeai/escape-engine";
import type { GmViewContext, NarrativeIntervention } from "@escapeai/shared";
import { buildGmViewContext } from "./context.js";

export function getRoomCharacter(
  session: SessionRecord,
  characterId: string,
): RoomCharacter | undefined {
  return session.room.characters?.[characterId];
}

export function isCharacterInScene(session: SessionRecord, characterId: string): boolean {
  const scene = session.room.scenes[session.currentSceneId];
  return (scene.characters ?? []).includes(characterId);
}

export function characterUsesSpokenPresentation(profile: RoomCharacter | undefined): boolean {
  if (!profile) return false;
  if (profile.spokenReplies === false) return false;
  return profile.spokenReplies === true || Boolean(profile.voiceTone);
}

export function pickCharacterFallback(profile: RoomCharacter): string {
  const lines = profile.fallbackLines?.length
    ? profile.fallbackLines
    : [`${profile.displayName} guarda silencio un momento y sugiere observar la escena.`];
  const idx = Math.floor(Math.random() * lines.length);
  return lines[idx]!;
}

export function buildGmViewContextForCharacter(
  session: SessionRecord,
  characterId: string,
  playerMessage: string,
  recentInterventions: NarrativeIntervention[],
  visitedSceneIds: string[],
  recentAuthorizedEvents: string[],
  nowMs = Date.now(),
): GmViewContext | undefined {
  const profile = getRoomCharacter(session, characterId);
  if (!profile || !isCharacterInScene(session, characterId)) return undefined;

  const base = buildGmViewContext(
    session,
    recentInterventions,
    visitedSceneIds,
    recentAuthorizedEvents,
    nowMs,
  );

  const knowledge = [...(profile.authorizedKnowledge ?? [])];
  if (profile.backstoryPublic) {
    knowledge.unshift(profile.backstoryPublic);
  }

  return {
    ...base,
    activeCharacterId: profile.id,
    activeCharacterDisplayName: profile.displayName,
    activeCharacterTone: profile.voiceTone,
    activeCharacterKnowledge: knowledge,
    activeCharacterForbiddenTopics: profile.forbiddenTopics ?? [],
    playerUtterance: playerMessage,
  };
}
