import type { GmViewContext } from "@escapeai/shared";
import { resolveLlmConfig, type LlmConfig } from "../llm-config.js";

export type LlmNarrationResult =
  | { ok: true; text: string; provider: LlmConfig["provider"]; model: string; latencyMs: number }
  | { ok: false; reason: string };

const LLM_TIMEOUT_MS = Number(process.env.GM_LLM_TIMEOUT_MS ?? 4000);

export async function generateNarrationLlm(
  context: GmViewContext,
  triggerType: string,
): Promise<LlmNarrationResult> {
  const llm = resolveLlmConfig();
  if (!llm) return { ok: false, reason: "no_provider" };

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const { generateText } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const client = createOpenAI({
      apiKey: llm.apiKey,
      baseURL: llm.baseURL,
    });

    const hintLine = context.authorizedHintLine;
    const userPayload = JSON.stringify({
      trigger: triggerType,
      context: hintLine
        ? { ...context, authorizedHintLine: hintLine }
        : context,
    });

    const hintRule = hintLine
      ? " Para pistas, parafrasea solo authorizedHintLine sin añadir datos nuevos ni la solución."
      : "";

    const { text } = await generateText({
      model: client(llm.model),
      abortSignal: controller.signal,
      system: [
        "Eres GameMaster de un escape room en español.",
        "No reveles códigos, soluciones ni dígitos concretos.",
        "Usa solo la información del contexto JSON.",
        "Máximo 2 frases, tono inmersivo, sin markdown.",
        hintRule,
      ]
        .join(" ")
        .trim(),
      prompt: userPayload,
    });

    const out = text.trim();
    if (!out) return { ok: false, reason: "empty_response" };
    return {
      ok: true,
      text: out,
      provider: llm.provider,
      model: llm.model,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    const reason = err instanceof Error && err.name === "AbortError" ? "timeout" : "llm_error";
    console.warn("GameMaster LLM failed:", triggerType, reason, err);
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

export async function generateNarrationLlmWithRetry(
  context: GmViewContext,
  triggerType: string,
): Promise<LlmNarrationResult> {
  const first = await generateNarrationLlm(context, triggerType);
  if (first.ok) return first;
  if (first.reason !== "timeout" && first.reason !== "llm_error") return first;
  return generateNarrationLlm(context, triggerType);
}
