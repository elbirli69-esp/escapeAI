import type { ScannedEnvironment } from "@escapeai/shared";

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function deriveClockDigits(
  env: ScannedEnvironment,
  proposalId: string,
  playSeed?: string,
): string {
  const salt = playSeed ? `:${playSeed}` : "";
  const n = stableHash(`${env.id}:${proposalId}:clock${salt}`) % 12;
  const hour = n + 10;
  return String(hour);
}

export function deriveCountAnswer(env: ScannedEnvironment, category: "chair" | "book" | "plant"): string {
  const total = env.objects
    .filter((o) => o.confirmed && o.category === category)
    .reduce((s, o) => s + o.quantity, 0);
  return String(Math.max(1, total));
}

export function deriveBookKeyword(env: ScannedEnvironment): string {
  const book = env.objects.find((o) => o.confirmed && o.category === "book");
  if (book?.label) {
    const word = book.label.split(/\s+/)[0]?.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/gi, "") ?? "";
    if (word.length >= 3) return word.slice(0, 12);
  }
  return "NORTE";
}

export function derivePlantKeyword(env: ScannedEnvironment): string {
  const plant = env.objects.find((o) => o.confirmed && o.category === "plant");
  return (plant?.label ?? "PLANTA").toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/gi, "").trim().split(/\s+/)[0] ?? "PLANTA";
}

export function deriveOcrDigit(env: ScannedEnvironment, proposalId: string, playSeed?: string): string {
  const salt = playSeed ? `:${playSeed}` : "";
  return String((stableHash(`${env.id}:${proposalId}:ocr${salt}`) % 9) + 1);
}

export function deriveColorSequence(
  env: ScannedEnvironment,
  proposalId: string,
  playSeed?: string,
): string {
  const salt = playSeed ? `:${playSeed}` : "";
  const palettes = ["314", "132", "231"];
  return palettes[stableHash(`${env.id}:${proposalId}:color${salt}`) % palettes.length]!;
}

export function deriveQrAnswer(proposalId: string): string {
  return `ZONA-${proposalId.slice(0, 4).toUpperCase()}`;
}

export function deriveFinalCode(parts: string[], mode: "digits" | "letters"): string {
  if (mode === "digits") {
    return parts.join("").replace(/\D/g, "").padStart(4, "0").slice(-4);
  }
  return parts.join("").toUpperCase().replace(/[^A-Z]/g, "X").padEnd(4, "X").slice(0, 4);
}

export function deriveVisualCount(env: ScannedEnvironment, category: "painting" | "decoration"): string {
  const n = env.objects
    .filter((o) => o.confirmed && o.category === category)
    .reduce((s, o) => s + o.quantity, 0);
  return String(Math.max(1, n));
}
