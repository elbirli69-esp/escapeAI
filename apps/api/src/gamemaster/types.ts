import type { GmSessionMeta } from "./persistence.js";

export type { GmProcessTrigger, GmTriggerType, GmViewContext, NarrativeIntervention } from "@escapeai/shared";

export type GmRuntimeBudget = {
  llmRemaining: number;
  cooldownMs: number;
  canCallLlm: boolean;
};

export type GmPersistedState = {
  meta: GmSessionMeta;
};
