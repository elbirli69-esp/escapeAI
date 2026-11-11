export type LlmProvider = "deepseek" | "openai";

export type LlmConfig = {
  apiKey: string;
  baseURL?: string;
  model: string;
  provider: LlmProvider;
};

/** Resuelve DeepSeek (como StorIAteller) u OpenAI-compatible. */
export function resolveLlmConfig(): LlmConfig | undefined {
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = deepseekKey || openaiKey;
  if (!apiKey) return undefined;

  const provider: LlmProvider = deepseekKey ? "deepseek" : "openai";
  const baseURL =
    process.env.OPENAI_BASE_URL?.trim() ||
    (provider === "deepseek" ? "https://api.deepseek.com/v1" : undefined);
  const model =
    process.env.OPENAI_MODEL?.trim() ||
    (provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini");

  return { apiKey, baseURL, model, provider };
}

export function isNarratorConfigured(): boolean {
  return Boolean(resolveLlmConfig());
}
