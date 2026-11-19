/** Código de evento: 6 caracteres hex (mismo formato que `createJoinCode` en API). */
export function normalizeJoinCodeInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 6);
}

export function isJoinCodeValid(code: string): boolean {
  return /^[A-F0-9]{6}$/.test(code.trim());
}