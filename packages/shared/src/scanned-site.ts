export type SiteLinkKind = "door" | "stairs" | "open";

export type SiteLink = {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  label: string;
  transitionKind: SiteLinkKind;
  confirmed: boolean;
};

export type SiteMapLayout = "linear" | "hub";

/**
 * Contexto geográfico del recinto: solo para quizzes del entorno (ciudad, barrio, curiosidades).
 * No se usa para waypoints ni navegación entre habitaciones interiores.
 */
export type SiteGeoContext = {
  city: string;
  neighborhood?: string;
  /** Ancla aproximada (lectura única al aire libre o ventana); radio amplio. */
  anchorLat?: number;
  anchorLon?: number;
  /** Radio para confirmar zona urbana antes del quiz (por defecto 12 km). */
  areaRadiusMeters?: number;
};

export type ScannedSite = {
  id: string;
  name: string;
  roomIds: string[];
  links: SiteLink[];
  mapLayout: SiteMapLayout;
  geoContext?: SiteGeoContext;
  outdoorRoomId?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SaveScannedSiteRequest = Omit<
  ScannedSite,
  "id" | "createdAt" | "updatedAt" | "version"
> & { id?: string };

export type ScannedSiteSummary = {
  id: string;
  name: string;
  roomCount: number;
  linkCount: number;
  city?: string;
  hasOutdoor?: boolean;
  updatedAt: string;
};

export const DEFAULT_SITE_AREA_RADIUS_METERS = 12_000;
