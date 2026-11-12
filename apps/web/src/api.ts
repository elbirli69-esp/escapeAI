import type {
  AdventureTemplateInfo,
  ApplyResult,
  CreateEventRequest,
  EventLeaderboard,
  EventPreview,
  GameAction,
  JoinEventResponse,
  PublicState,
  CreateSpatialEventRequest,
  CreateSpatialSiteEventRequest,
  SaveScannedEnvironmentRequest,
  SaveScannedSiteRequest,
  ScannedEnvironment,
  ScannedEnvironmentSummary,
  ScannedSite,
  SiteProposalsResponse,
  SpatialAdventureProposal,
  SpatialProposalsResponse,
} from "@escapeai/shared";

const base = "/api";

export type RoomSummary = {
  id: string;
  title: string;
  summary: string;
  tagline?: string;
  coverImage?: string;
  theme?: string;
  sceneCount?: number;
  timeLimitSec: number;
};

export async function fetchRooms(): Promise<RoomSummary[]> {
  const res = await fetch(`${base}/rooms`);
  if (!res.ok) throw new Error("No se pudo cargar el catálogo");
  const data = await res.json();
  return data.rooms as RoomSummary[];
}

export async function createSession(roomId = "pilot"): Promise<{
  sessionId: string;
  state: PublicState;
}> {
  const res = await fetch(`${base}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId }),
  });
  if (!res.ok) throw new Error("No se pudo crear la sesión");
  return res.json();
}

export async function fetchAdventureTemplates(): Promise<AdventureTemplateInfo[]> {
  const res = await fetch(`${base}/adventures`);
  if (!res.ok) throw new Error("No se pudieron cargar las plantillas");
  const data = await res.json();
  return data.templates as AdventureTemplateInfo[];
}

export async function createCustomEvent(body: CreateEventRequest): Promise<EventPreview> {
  const res = await fetch(`${base}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo crear el evento");
  return (data as { preview: EventPreview }).preview;
}

export async function joinEventAsTeam(
  joinCode: string,
  teamName: string,
): Promise<JoinEventResponse> {
  const res = await fetch(`${base}/events/${encodeURIComponent(joinCode)}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: teamName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo registrar el equipo");
  return data as JoinEventResponse;
}

/** @deprecated Usa joinEventAsTeam */
export async function joinEventAsPlayer(joinCode: string, displayName: string): Promise<JoinEventResponse> {
  return joinEventAsTeam(joinCode, displayName);
}

export async function fetchEventLeaderboard(joinCode: string): Promise<EventLeaderboard> {
  const res = await fetch(`${base}/events/${encodeURIComponent(joinCode)}/leaderboard`);
  if (!res.ok) throw new Error("Evento no encontrado");
  return res.json();
}

export async function fetchPexelsImage(query: string): Promise<{ url: string; source: string }> {
  const res = await fetch(`${base}/media/pexels?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("No se pudo cargar imagen");
  return res.json();
}

export async function fetchFalImage(prompt: string): Promise<{ url: string; source: string }> {
  const res = await fetch(`${base}/media/fal-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("No se pudo generar imagen");
  return res.json();
}

export async function startEventSession(
  eventCode: string,
  teamId: string,
): Promise<{ sessionId: string; state: PublicState }> {
  const res = await fetch(`${base}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventCode, teamId, playerId: teamId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo iniciar la partida");
  return data as { sessionId: string; state: PublicState };
}

export async function fetchState(sessionId: string): Promise<PublicState> {
  const res = await fetch(`${base}/sessions/${sessionId}`);
  if (!res.ok) throw new Error("Sesión no encontrada");
  const data = await res.json();
  return data.state as PublicState;
}

export async function listScannedEnvironments(): Promise<ScannedEnvironmentSummary[]> {
  const res = await fetch(`${base}/scanned-environments`);
  if (!res.ok) throw new Error("No se pudieron cargar inventarios");
  const data = await res.json();
  return (data as { items: ScannedEnvironmentSummary[] }).items;
}

export async function fetchScannedEnvironment(id: string): Promise<ScannedEnvironment> {
  const res = await fetch(`${base}/scanned-environments/${encodeURIComponent(id)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Inventario no encontrado");
  return (data as { environment: ScannedEnvironment }).environment;
}

export async function fetchSpatialProposals(scannedEnvironmentId: string): Promise<SpatialProposalsResponse> {
  const res = await fetch(`${base}/scanned-environments/${encodeURIComponent(scannedEnvironmentId)}/proposals`, {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudieron generar propuestas");
  return data as SpatialProposalsResponse;
}

export async function createSpatialEvent(
  scannedEnvironmentId: string,
  body: CreateSpatialEventRequest,
): Promise<{ preview: EventPreview; proposal: SpatialAdventureProposal; prepChecklist: SpatialAdventureProposal["prepChecklist"] }> {
  const res = await fetch(`${base}/scanned-environments/${encodeURIComponent(scannedEnvironmentId)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo crear el evento");
  return data as {
    preview: EventPreview;
    proposal: SpatialAdventureProposal;
    prepChecklist: SpatialAdventureProposal["prepChecklist"];
  };
}

export async function saveScannedSite(body: SaveScannedSiteRequest): Promise<ScannedSite> {
  const isUpdate = Boolean(body.id);
  const url = isUpdate
    ? `${base}/scanned-sites/${encodeURIComponent(body.id!)}`
    : `${base}/scanned-sites`;
  const res = await fetch(url, {
    method: isUpdate ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo guardar el recinto");
  return (data as { site: ScannedSite }).site;
}

export async function fetchSpatialSiteProposals(scannedSiteId: string): Promise<SiteProposalsResponse> {
  const res = await fetch(`${base}/scanned-sites/${encodeURIComponent(scannedSiteId)}/proposals`, {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudieron generar propuestas");
  return data as SiteProposalsResponse;
}

export async function createSpatialSiteEvent(
  scannedSiteId: string,
  body: CreateSpatialSiteEventRequest,
): Promise<{ preview: EventPreview; proposal: SpatialAdventureProposal; prepChecklist: SpatialAdventureProposal["prepChecklist"] }> {
  const res = await fetch(`${base}/scanned-sites/${encodeURIComponent(scannedSiteId)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo crear el evento");
  return data as {
    preview: EventPreview;
    proposal: SpatialAdventureProposal;
    prepChecklist: SpatialAdventureProposal["prepChecklist"];
  };
}

export async function saveScannedEnvironment(body: SaveScannedEnvironmentRequest): Promise<ScannedEnvironment> {
  const isUpdate = Boolean(body.id);
  const url = isUpdate
    ? `${base}/scanned-environments/${encodeURIComponent(body.id!)}`
    : `${base}/scanned-environments`;
  const res = await fetch(url, {
    method: isUpdate ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo guardar el inventario");
  return (data as { environment: ScannedEnvironment }).environment;
}

export async function sendAction(
  sessionId: string,
  action: GameAction,
): Promise<ApplyResult> {
  const res = await fetch(`${base}/sessions/${sessionId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!res.ok) throw new Error("Error en la acción");
  return res.json();
}
