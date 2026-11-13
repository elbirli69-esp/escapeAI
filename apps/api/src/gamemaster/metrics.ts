import type { NarrativeInterventionMeta } from "@escapeai/shared";

type GmRuntimeCounters = {
  interventionsTotal: number;
  llmAttempts: number;
  llmSuccesses: number;
  llmFallbacks: number;
  staticInterventions: number;
  byTrigger: Record<string, number>;
};

const counters: GmRuntimeCounters = {
  interventionsTotal: 0,
  llmAttempts: 0,
  llmSuccesses: 0,
  llmFallbacks: 0,
  staticInterventions: 0,
  byTrigger: {},
};

export function recordGmLlmAttempt(): void {
  counters.llmAttempts += 1;
}

export function recordGmIntervention(
  triggerType: string,
  meta: NarrativeInterventionMeta,
  llmAttempted = false,
): void {
  counters.interventionsTotal += 1;
  counters.byTrigger[triggerType] = (counters.byTrigger[triggerType] ?? 0) + 1;

  if (meta.provider !== "static" && !meta.fallback) {
    counters.llmSuccesses += 1;
    return;
  }
  if (llmAttempted) {
    counters.llmFallbacks += 1;
    return;
  }
  counters.staticInterventions += 1;
}

export function getGmHealthSnapshot(): {
  scope: "process";
  interventionsTotal: number;
  llmAttempts: number;
  llmSuccesses: number;
  llmFallbacks: number;
  staticInterventions: number;
  fallbackRate: number | null;
  byTrigger: Record<string, number>;
} {
  const fallbackRate =
    counters.llmAttempts > 0 ? Math.round((counters.llmFallbacks / counters.llmAttempts) * 1000) / 1000 : null;

  return {
    scope: "process",
    interventionsTotal: counters.interventionsTotal,
    llmAttempts: counters.llmAttempts,
    llmSuccesses: counters.llmSuccesses,
    llmFallbacks: counters.llmFallbacks,
    staticInterventions: counters.staticInterventions,
    fallbackRate,
    byTrigger: { ...counters.byTrigger },
  };
}

/** Solo tests. */
export function resetGmMetricsForTests(): void {
  counters.interventionsTotal = 0;
  counters.llmAttempts = 0;
  counters.llmSuccesses = 0;
  counters.llmFallbacks = 0;
  counters.staticInterventions = 0;
  counters.byTrigger = {};
}
