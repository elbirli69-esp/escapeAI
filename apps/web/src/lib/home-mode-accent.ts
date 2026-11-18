export type HomeModeId = "scan" | "create" | "join" | "organizer" | "catalog";

export type HomeModeAccent = "urban" | "coastal" | "celebration";

/** Acento visual en hover/focus de tarjetas del inicio (P3). */
export const HOME_MODE_ACCENT: Record<HomeModeId, HomeModeAccent> = {
  scan: "urban",
  create: "celebration",
  join: "urban",
  organizer: "coastal",
  catalog: "coastal",
};

export function homeModeAccentClass(mode: HomeModeId): string {
  return `accent-${HOME_MODE_ACCENT[mode]}`;
}