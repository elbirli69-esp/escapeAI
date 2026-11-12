import { isValidGeoCoordinates } from "./geo.js";
import type {
  SaveScannedSiteRequest,
  ScannedSite,
  ScannedSiteSummary,
  SiteGeoContext,
  SiteLink,
  SiteLinkKind,
  SiteMapLayout,
} from "./scanned-site.js";
import { DEFAULT_SITE_AREA_RADIUS_METERS } from "./scanned-site.js";

const LINK_KINDS: SiteLinkKind[] = ["door", "stairs", "open"];
const MAP_LAYOUTS: SiteMapLayout[] = ["linear", "hub"];

export type SanitizeSiteResult =
  | { ok: true; body: SaveScannedSiteRequest }
  | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseGeo(raw: unknown): SiteGeoContext | undefined {
  if (!isPlainObject(raw)) return undefined;
  const city = typeof raw.city === "string" ? raw.city.trim() : "";
  if (city.length < 2) return undefined;
  const neighborhood =
    typeof raw.neighborhood === "string" && raw.neighborhood.trim()
      ? raw.neighborhood.trim()
      : undefined;
  const anchorLat = typeof raw.anchorLat === "number" ? raw.anchorLat : undefined;
  const anchorLon = typeof raw.anchorLon === "number" ? raw.anchorLon : undefined;
  if (anchorLat !== undefined && anchorLon !== undefined) {
    if (!isValidGeoCoordinates(anchorLat, anchorLon)) {
      return undefined;
    }
  }
  let areaRadiusMeters = DEFAULT_SITE_AREA_RADIUS_METERS;
  if (typeof raw.areaRadiusMeters === "number" && raw.areaRadiusMeters >= 500) {
    areaRadiusMeters = Math.floor(raw.areaRadiusMeters);
  }
  return {
    city,
    neighborhood,
    anchorLat,
    anchorLon,
    areaRadiusMeters,
  };
}

function parseLink(raw: unknown): SiteLink | undefined {
  if (!isPlainObject(raw)) return undefined;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const fromRoomId = typeof raw.fromRoomId === "string" ? raw.fromRoomId.trim() : "";
  const toRoomId = typeof raw.toRoomId === "string" ? raw.toRoomId.trim() : "";
  const label = typeof raw.label === "string" ? raw.label.trim() : "Pasaje";
  const transitionKind = raw.transitionKind as SiteLinkKind;
  if (!id || !fromRoomId || !toRoomId || !LINK_KINDS.includes(transitionKind)) return undefined;
  return {
    id,
    fromRoomId,
    toRoomId,
    label: label || "Pasaje",
    transitionKind,
    confirmed: raw.confirmed === true,
  };
}

export function sanitizeScannedSiteInput(raw: unknown): SanitizeSiteResult {
  if (!isPlainObject(raw)) return { ok: false, error: "Cuerpo inválido." };

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length < 2) return { ok: false, error: "Indica un nombre para el recinto (mínimo 2 caracteres)." };

  const roomIds = Array.isArray(raw.roomIds)
    ? raw.roomIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim())
    : [];
  const uniqueRooms = [...new Set(roomIds)];
  if (uniqueRooms.length < 1) return { ok: false, error: "Añade al menos un inventario de habitación." };

  const mapLayout = (raw.mapLayout as SiteMapLayout) ?? "linear";
  if (!MAP_LAYOUTS.includes(mapLayout)) {
    return { ok: false, error: "mapLayout debe ser linear o hub." };
  }

  const links: SiteLink[] = [];
  if (Array.isArray(raw.links)) {
    for (const item of raw.links) {
      const link = parseLink(item);
      if (link) links.push(link);
    }
  }

  const geoContext = raw.geoContext !== undefined ? parseGeo(raw.geoContext) : undefined;
  if (raw.geoContext !== undefined && !geoContext) {
    return { ok: false, error: "geoContext inválido (indica ciudad y coordenadas opcionales válidas)." };
  }

  const outdoorRoomId =
    typeof raw.outdoorRoomId === "string" && raw.outdoorRoomId.trim()
      ? raw.outdoorRoomId.trim()
      : undefined;
  if (outdoorRoomId && !uniqueRooms.includes(outdoorRoomId)) {
    return { ok: false, error: "outdoorRoomId debe estar en roomIds." };
  }

  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : undefined;

  return {
    ok: true,
    body: {
      id,
      name,
      roomIds: uniqueRooms,
      links,
      mapLayout,
      geoContext,
      outdoorRoomId,
    },
  };
}

export function toScannedSiteSummary(site: ScannedSite): ScannedSiteSummary {
  return {
    id: site.id,
    name: site.name,
    roomCount: site.roomIds.length,
    linkCount: site.links.length,
    city: site.geoContext?.city,
    updatedAt: site.updatedAt,
  };
}
