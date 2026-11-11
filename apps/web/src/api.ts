import type { ApplyResult, GameAction, PublicState } from "@escapeai/shared";

const base = "/api";

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
