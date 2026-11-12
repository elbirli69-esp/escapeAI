export type NormalizeMode = "uppercase" | "lowercase" | "trim";
export type VoiceMatchMode = "exact" | "fuzzy" | "digits";

const ES_DIGITS: Record<string, string> = {
  cero: "0",
  uno: "1",
  una: "1",
  dos: "2",
  tres: "3",
  cuatro: "4",
  cinco: "5",
  seis: "6",
  siete: "7",
  ocho: "8",
  nueve: "9",
};

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normalizeAnswerText(value: string, mode?: NormalizeMode): string {
  let v = value.trim();
  v = stripDiacritics(v);
  if (mode === "uppercase") v = v.toUpperCase();
  if (mode === "lowercase") v = v.toLowerCase();
  return v;
}

export function spanishSpokenToDigits(text: string): string {
  const parts = stripDiacritics(text.toLowerCase()).split(/[\s,.-]+/);
  return parts.map((p) => ES_DIGITS[p] ?? p).join("");
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = row[j]!;
      row[j] = next;
    }
  }
  return row[b.length]!;
}

function fuzzyMaxDistance(expected: string): number {
  if (expected.length <= 4) return 1;
  if (expected.length <= 8) return 2;
  return 3;
}

export type MatchAnswerOptions = {
  normalize?: NormalizeMode;
  voiceMatchMode?: VoiceMatchMode;
  /** Alternativas aceptadas (cámara, etc.). */
  synonyms?: string[];
};

export function matchPlayerAnswer(
  raw: string,
  expected: string,
  options: MatchAnswerOptions = {},
): boolean {
  const mode = options.normalize;
  const voiceMode = options.voiceMatchMode ?? "exact";

  let value = normalizeAnswerText(raw, mode);
  let target = normalizeAnswerText(expected, mode);

  if (voiceMode === "digits") {
    value = spanishSpokenToDigits(value);
    target = spanishSpokenToDigits(target);
  }

  const candidates = [target, ...(options.synonyms ?? []).map((s) => normalizeAnswerText(s, mode))];

  for (const exp of candidates) {
    if (voiceMode === "fuzzy") {
      const maxD = fuzzyMaxDistance(exp);
      if (levenshteinDistance(value, exp) <= maxD) return true;
    } else if (value === exp) {
      return true;
    }
  }
  return false;
}
