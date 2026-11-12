import type { SessionRecord } from "@escapeai/escape-engine";
import { toPublicState } from "@escapeai/escape-engine";
import type { GmProcessTrigger } from "@escapeai/shared";
import { randomUUID } from "node:crypto";
import type { GmInterventionStore } from "./persistence.js";

export async function checkTimeWarningTriggers(
  session: SessionRecord,
  store: GmInterventionStore,
  nowMs = Date.now(),
): Promise<GmProcessTrigger[]> {
  if (session.status !== "playing") return [];

  const state = toPublicState(session, nowMs);
  if (state.timeRemainingSec <= 0) return [];

  const triggers: GmProcessTrigger[] = [];
  const limit = state.timeLimitSec;
  const remaining = state.timeRemainingSec;
  const ratio = remaining / Math.max(1, limit);

  const candidates: Array<{ dedupe: string; label: string; when: boolean }> = [
    {
      dedupe: "TIME_WARNING:5min",
      label: "unos 5 minutos",
      when: remaining <= 300,
    },
    {
      dedupe: "TIME_WARNING:25pct",
      label: "aproximadamente un 25% del tiempo",
      when: ratio <= 0.25,
    },
    {
      dedupe: "TIME_WARNING:10pct",
      label: "aproximadamente un 10% del tiempo",
      when: ratio <= 0.1,
    },
  ];

  for (const c of candidates) {
    if (!c.when) continue;
    const fresh = await store.tryDedupe(session.sessionId, c.dedupe);
    if (!fresh) continue;
    triggers.push({
      type: "TIME_WARNING",
      sourceEventId: randomUUID(),
      payload: { label: c.label, remaining },
    });
  }

  return triggers;
}
