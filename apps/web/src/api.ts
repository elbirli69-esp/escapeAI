import type {
  AdventureTemplateInfo,
  ApplyResult,
  CreateEventRequest,
  EventPreview,
  GameAction,
  JoinEventResponse,
  PublicState,
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

export async function joinEventAsPlayer(
  joinCode: string,
  displayName: string,
): Promise<JoinEventResponse> {
  const res = await fetch(`${base}/events/${encodeURIComponent(joinCode)}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "No se pudo unir al evento");
  return data as JoinEventResponse;
}

export async function startEventSession(
  eventCode: string,
  playerId: string,
): Promise<{ sessionId: string; state: PublicState }> {
  const res = await fetch(`${base}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventCode, playerId }),
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
