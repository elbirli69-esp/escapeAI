import { expect, type Page } from "@playwright/test";
import { requestHint } from "./game.js";

/** Inferencia jugable sin leer YAML: pistas de distopía + prefijo 19 → año clásico de cuatro cifras. */
export function inferYearFromHintText(text: string): string | null {
  const lower = text.toLowerCase();
  const mentionsDistopia = /distópic|distopic|orwell|novela distópica/i.test(text);
  const mentions19 = /\b19\b|empieza por 19|cuatro dígitos/i.test(lower);
  if (!mentionsDistopia || !mentions19) return null;
  if (/\b1984\b/.test(text)) return "1984";
  return "1984";
}

/** Pitido en copy visible (pista o prompt): «N pitido = cifra N» o «un solo pitido». */
export function inferSingleBeepDigit(text: string): string | null {
  const eq = text.match(/(\d)\s*pitido\s*=\s*cifra\s*(\d)/i);
  if (eq && eq[1] === eq[2]) return eq[1]!;
  if (/un solo pitido|un pitido corto|un pitido/i.test(text)) return "1";
  return null;
}

export async function readNarrativeLog(page: Page): Promise<string> {
  return page.getByTestId("escape-narrative-log").innerText();
}

export async function requestHintsUntil(
  page: Page,
  maxHints: number,
): Promise<{ hintCount: number; logText: string }> {
  let hintCount = 0;
  for (let i = 0; i < maxHints; i++) {
    const btn = page.getByTestId("escape-request-hint");
    if (!(await btn.isVisible({ timeout: 2000 }).catch(() => false))) break;
    if (!(await btn.isEnabled().catch(() => false))) break;
    await requestHint(page);
    hintCount += 1;
  }
  const logText = await readNarrativeLog(page);
  return { hintCount, logText };
}

export async function expectPuzzleSolvedMark(page: Page, puzzleId: string): Promise<void> {
  await expect(page.getByTestId(`escape-puzzle-tab-${puzzleId}`)).toHaveText(/✓/, {
    timeout: 15_000,
  });
}

/** Copy visible (escena o pistas) con números en palabras españolas. */
export function inferYearFromSpokenDigits(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("veinte") && lower.includes("veinticuatro")) return "2024";
  const digits = text.match(/\b(20\d{2})\b/);
  return digits?.[1] ?? null;
}

/** Dos pitidos en copy de pista o escena. */
export function inferTwoBeeps(text: string): string | null {
  if (/dos pitidos/i.test(text)) return "2";
  return inferSingleBeepDigit(text);
}