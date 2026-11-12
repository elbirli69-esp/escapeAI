import type { SiteGeoContext } from "./scanned-site.js";
import { DEFAULT_SITE_AREA_RADIUS_METERS } from "./scanned-site.js";

export function normalizeGeoToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function resolveSiteAreaRadius(ctx: SiteGeoContext): number {
  const r = ctx.areaRadiusMeters;
  if (r !== undefined && Number.isFinite(r) && r >= 500) return Math.floor(r);
  return DEFAULT_SITE_AREA_RADIUS_METERS;
}

export function hasGeoAnchor(ctx: SiteGeoContext): boolean {
  return (
    ctx.anchorLat !== undefined &&
    ctx.anchorLon !== undefined &&
    Number.isFinite(ctx.anchorLat) &&
    Number.isFinite(ctx.anchorLon)
  );
}

export function deriveCityQuizAnswer(ctx: SiteGeoContext): string {
  return normalizeGeoToken(ctx.city);
}

export function deriveNeighborhoodQuizAnswer(ctx: SiteGeoContext): string {
  if (ctx.neighborhood?.trim()) return normalizeGeoToken(ctx.neighborhood);
  return deriveCityQuizAnswer(ctx);
}

/** Palabra determinista para «comercio cercano» sin API de mapas (organizador adapta la carta). */
export function deriveNearbyKeyword(ctx: SiteGeoContext, seed: string): string {
  const base = `${ctx.city}|${ctx.neighborhood ?? ""}|${seed}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  const words = ["molino", "farol", "esquina", "mercado", "torre", "jardin", "muelle", "plaza"];
  return words[hash % words.length]!;
}

export function buildAreaQuizPrompt(ctx: SiteGeoContext): string {
  const place = ctx.neighborhood
    ? `${ctx.neighborhood} (${ctx.city})`
    : ctx.city;
  return `Confirma que estáis en la zona de ${place}. El GPS en interiores es aproximado; basta con fijar la ciudad o barrio indicado por el organizador.`;
}

export function buildCityQuizQuestion(ctx: SiteGeoContext): string {
  return `¿En qué ciudad se desarrolla este recorrido (${ctx.city})? (minúsculas, sin tildes opcional)`;
}

export function buildNeighborhoodQuizQuestion(ctx: SiteGeoContext): string {
  if (ctx.neighborhood?.trim()) {
    return `Pregunta del barrio: escribe el nombre del barrio «${ctx.neighborhood}» en minúsculas.`;
  }
  return buildCityQuizQuestion(ctx);
}

export function buildNearbyCuriosityQuestion(ctx: SiteGeoContext, seed: string): string {
  const kw = deriveNearbyKeyword(ctx, seed);
  return (
    `Curiosidad del entorno en ${ctx.city}: según la carta del organizador, ` +
    `¿cuál es la palabra clave del establecimiento cercano? (pista: empieza por «${kw.slice(0, 2)}»)`
  );
}
