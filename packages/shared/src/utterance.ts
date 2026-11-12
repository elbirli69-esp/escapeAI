/** Limpia texto libre del jugador (personajes, futuro chat). */
export function sanitizePlayerUtterance(raw: string, maxLen = 280): string {
  const collapsed = raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed.slice(0, maxLen);
}
