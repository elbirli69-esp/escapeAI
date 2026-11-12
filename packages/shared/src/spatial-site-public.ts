import type { SiteLink, SiteMapLayout } from "./scanned-site.js";

export type SpatialSiteVisitStep = {
  order: number;
  label: string;
  sceneId: string;
  kind?: "indoor" | "outdoor";
};

/** Mapa del recinto expuesto al jugador (sin datos de escaneo). */
export type SpatialSiteMapPublic = {
  siteName: string;
  mapLayout: SiteMapLayout;
  rooms: Array<{ inventoryId: string; sceneId: string; label: string }>;
  links: SiteLink[];
  /** Orden sugerido de visita física (organizador / roomIds). */
  suggestedVisit: SpatialSiteVisitStep[];
  /** Escena actual si es una estancia física (no contexto/finale). */
  currentSpatialSceneId?: string;
  /** Índice 1-based en suggestedVisit cuando estás en una habitación. */
  currentVisitOrder?: number;
};
