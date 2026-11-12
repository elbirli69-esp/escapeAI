import type { SiteLink, SiteMapLayout } from "./scanned-site.js";

/** Mapa del recinto expuesto al jugador (sin datos de escaneo). */
export type SpatialSiteMapPublic = {
  siteName: string;
  mapLayout: SiteMapLayout;
  rooms: Array<{ inventoryId: string; sceneId: string; label: string }>;
  links: SiteLink[];
  /** Escena actual si es una estancia física (no contexto/finale). */
  currentSpatialSceneId?: string;
};
