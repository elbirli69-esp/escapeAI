import { getExitAvailability, toPublicState, type SessionRecord } from "@escapeai/escape-engine";
import type {
  GameAction,
  GameEvent,
  GmProcessTrigger,
  NarrativeIntervention,
} from "@escapeai/shared";
import { randomUUID } from "node:crypto";
import { buildGmViewContext, buildGmViewContextForHint, collectForbiddenAnswerTokens } from "./context.js";
import { staticInterventionText } from "./fallbacks.js";
import { hintSpoilerLevel } from "./hints.js";
import {
  detectTeamStuckTrigger,
  markStuckNotified,
  updateProgressMeta,
} from "./stuck-detection.js";
import type { GmInterventionStore } from "./persistence.js";
import { generateNarrationLlmWithRetry } from "./provider.js";
import { checkTimeWarningTriggers } from "./time-warnings.js";
import {
  collectTriggersFromGameplay,
  sessionStartedTrigger,
  TRIGGER_POLICY,
  type ExitSnapshot,
} from "./triggers.js";
import { validateIntervention } from "./validation.js";

const MAX_LLM_PER_SESSION = Number(process.env.GM_MAX_LLM_CALLS ?? 40);
const LLM_COOLDOWN_MS = Number(process.env.GM_LLM_COOLDOWN_MS ?? 3000);

export class GameMasterService {
  constructor(private readonly store: GmInterventionStore) {}

  async listInterventions(sessionId: string): Promise<NarrativeIntervention[]> {
    return this.store.list(sessionId);
  }

  async processSessionStarted(session: SessionRecord): Promise<NarrativeIntervention[]> {
    const meta = await this.store.loadMeta(session.sessionId);
    meta.visitedSceneIds = [...new Set([...meta.visitedSceneIds, session.room.startSceneId])];
    await this.store.saveMeta(session.sessionId, meta);
    return this.processTriggers(session, [sessionStartedTrigger()], ["SESSION_STARTED"]);
  }

  async processAfterAction(input: {
    session: SessionRecord;
    action: GameAction;
    events: GameEvent[];
    beforeExits: ExitSnapshot;
  }): Promise<NarrativeIntervention[]> {
    let meta = await this.store.loadMeta(input.session.sessionId);
    meta = updateProgressMeta(input.session, input.action, input.events, meta);
    await this.store.saveMeta(input.session.sessionId, meta);

    const timeTriggers = await checkTimeWarningTriggers(input.session, this.store);
    const gameplayTriggers = collectTriggersFromGameplay({
      action: input.action,
      gameEvents: input.events,
      beforeExits: input.beforeExits,
      afterSession: input.session,
    });
    const stuck = detectTeamStuckTrigger(input.session, meta);
    const stuckTriggers = stuck ? [stuck] : [];
    const recentEvents = input.events.map((e) => e.type);
    return this.processTriggers(
      input.session,
      [...gameplayTriggers, ...timeTriggers, ...stuckTriggers],
      recentEvents,
    );
  }

  async processOnRead(session: SessionRecord): Promise<NarrativeIntervention[]> {
    const meta = await this.store.loadMeta(session.sessionId);
    const timeTriggers = await checkTimeWarningTriggers(session, this.store);
    const stuck = detectTeamStuckTrigger(session, meta);
    const stuckTriggers = stuck ? [stuck] : [];
    if (timeTriggers.length === 0 && stuckTriggers.length === 0) return [];
    return this.processTriggers(session, [...timeTriggers, ...stuckTriggers], []);
  }

  private async processTriggers(
    session: SessionRecord,
    triggers: GmProcessTrigger[],
    recentAuthorizedEvents: string[],
  ): Promise<NarrativeIntervention[]> {
    if (triggers.length === 0) return [];

    const created: NarrativeIntervention[] = [];
    const existing = await this.store.list(session.sessionId);
    let meta = await this.store.loadMeta(session.sessionId);
    const forbidden = collectForbiddenAnswerTokens(session);

    for (const trigger of triggers) {
      if (trigger.type === "PUZZLE_FAILED" && TRIGGER_POLICY.PUZZLE_FAILED === "silent") {
        continue;
      }

      const policy = TRIGGER_POLICY[trigger.type] ?? "static";
      if (policy === "silent") continue;

      const recent = [...existing, ...created];
      let intervention = await this.renderIntervention(
        session,
        trigger,
        recent,
        recentAuthorizedEvents,
        meta,
        forbidden,
        policy,
      );
      if (!intervention) continue;

      const seq = await this.store.bumpSequence(session.sessionId);
      intervention = { ...intervention, sequence: seq };
      await this.store.append(session.sessionId, intervention);
      created.push(intervention);

      if (trigger.type === "SCENE_ENTERED" && trigger.payload?.sceneId) {
        const sceneId = String(trigger.payload.sceneId);
        meta.visitedSceneIds = [...new Set([...meta.visitedSceneIds, sceneId])];
        await this.store.saveMeta(session.sessionId, meta);
      }
      if (trigger.type === "TEAM_STUCK" && trigger.payload?.puzzleId) {
        const puzzleId = String(trigger.payload.puzzleId);
        meta = markStuckNotified(meta, puzzleId);
        await this.store.saveMeta(session.sessionId, meta);
      }
    }

    return created;
  }

  private async renderIntervention(
    session: SessionRecord,
    trigger: GmProcessTrigger,
    recentInterventions: NarrativeIntervention[],
    recentAuthorizedEvents: string[],
    meta: Awaited<ReturnType<GmInterventionStore["loadMeta"]>>,
    forbidden: string[],
    policy: string,
  ): Promise<NarrativeIntervention | null> {
    const dedupe = `${trigger.type}:${trigger.payload?.puzzleId ?? trigger.payload?.sceneId ?? trigger.payload?.itemId ?? trigger.sourceEventId}`;
    if (recentInterventions.some((i) => i.meta.trigger === dedupe)) {
      return null;
    }

    const staticPack = staticInterventionText(session, trigger);
    let text = staticPack.text;
    let metaOut = { ...staticPack.meta, trigger: dedupe };
    let spoilerLevel =
      staticPack.kind === "hint"
        ? hintSpoilerLevel(Number(trigger.payload?.level ?? 1))
        : 0;
    let clueRefs: NarrativeIntervention["clueRefs"];
    if (trigger.type === "HINT_GRANTED" && trigger.payload?.puzzleId) {
      const puzzleId = String(trigger.payload.puzzleId);
      const level = Number(trigger.payload.level ?? 1);
      clueRefs = [{ puzzleId, hintLevel: level }];
    }

    const now = Date.now();
    const canLlm =
      policy === "llm_optional" &&
      meta.llmCallCount < MAX_LLM_PER_SESSION &&
      now - meta.lastLlmCallMs >= LLM_COOLDOWN_MS;

    if (canLlm) {
      const ctx =
        trigger.type === "HINT_GRANTED" && trigger.payload?.puzzleId
          ? buildGmViewContextForHint(
              session,
              String(trigger.payload.puzzleId),
              Number(trigger.payload.level ?? 1),
              recentInterventions,
              meta.visitedSceneIds,
              recentAuthorizedEvents,
            )
          : buildGmViewContext(
              session,
              recentInterventions,
              meta.visitedSceneIds,
              recentAuthorizedEvents,
            );
      if (!ctx && trigger.type === "HINT_GRANTED") {
        return null;
      }
      const llm = await generateNarrationLlmWithRetry(ctx!, trigger.type);
      if (llm.ok) {
        const v = validateIntervention({ text: llm.text, spoilerLevel, clueRefs }, forbidden);
        if (v.ok) {
          text = llm.text;
          metaOut = {
            provider: llm.provider,
            model: llm.model,
            latencyMs: llm.latencyMs,
            fallback: false,
            trigger: dedupe,
          };
          meta.llmCallCount += 1;
          meta.lastLlmCallMs = Date.now();
          await this.store.saveMeta(session.sessionId, meta);
          console.info(
            JSON.stringify({
              gm_provider: llm.provider,
              gm_model: llm.model,
              gm_latency_ms: llm.latencyMs,
              gm_fallback: false,
              gm_trigger: trigger.type,
              gm_session_id: session.sessionId,
            }),
          );
        }
      } else {
        console.info(
          JSON.stringify({
            gm_fallback: true,
            gm_trigger: trigger.type,
            gm_session_id: session.sessionId,
            reason: llm.reason,
          }),
        );
      }
    }

    const finalCheck = validateIntervention({ text, spoilerLevel, clueRefs }, forbidden);
    if (!finalCheck.ok) {
      const fallback = staticInterventionText(session, trigger);
      text = fallback.text;
      metaOut = { ...fallback.meta, trigger: dedupe };
    }

    const teamId = session.playerContext?.playerId;

    const presentation: NarrativeIntervention["presentation"] =
      trigger.type === "TIME_WARNING" || trigger.type === "TEAM_STUCK" ? "banner" : "inline";

    return {
      id: randomUUID(),
      sessionId: session.sessionId,
      teamId,
      sourceEventId: trigger.sourceEventId,
      kind: staticPack.kind,
      text,
      spoilerLevel,
      clueRefs,
      presentation,
      createdAt: Date.now(),
      sequence: 0,
      meta: metaOut,
    };
  }
}

export function snapshotExits(session: SessionRecord): ExitSnapshot {
  return getExitAvailability(session);
}

export function toOrchestratorShim(latest?: NarrativeIntervention) {
  if (!latest) return undefined;
  const src = latest.meta.provider;
  if (src === "static") return { message: latest.text, source: "fallback" as const };
  return { message: latest.text, source: src };
}

/** Estado público + intervenciones para respuestas API. */
export async function buildSessionView(
  session: SessionRecord,
  gm: GameMasterService,
  nowMs = Date.now(),
) {
  const state = toPublicState(session, nowMs);
  const gmInterventions = await gm.listInterventions(session.sessionId);
  return { state, gmInterventions };
}
