import type { NarrativeIntervention } from "@escapeai/shared";

const MAX_TEXT_LEN = 420;

export function validateIntervention(
  draft: Pick<NarrativeIntervention, "text" | "spoilerLevel" | "clueRefs">,
  forbiddenTokens: string[],
): { ok: true } | { ok: false; reason: string } {
  const text = draft.text.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > MAX_TEXT_LEN) return { ok: false, reason: "too_long" };
  if (/```|<script|ignore previous/i.test(text)) return { ok: false, reason: "unsafe" };

  const lower = text.toLowerCase();
  for (const token of forbiddenTokens) {
    if (token.length < 3) continue;
    if (lower.includes(token.toLowerCase())) {
      return { ok: false, reason: "spoiler_token" };
    }
  }

  return { ok: true };
}
