/** Semilla de juego por alcance (catálogo diario, evento espacial, etc.). */
export function dailyPlaySeed(scope: string, at: Date = new Date()): string {
  const day = at.toISOString().slice(0, 10);
  return `${day}:${scope}`;
}

export function stableHash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
