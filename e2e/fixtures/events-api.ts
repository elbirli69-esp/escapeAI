import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { CreateEventRequest } from "@escapeai/shared";

const API_BASE = "http://127.0.0.1:8787/api";

export const ADA_MYSTERY_EVENT: CreateEventRequest = {
  adventureType: "mystery",
  teamCount: 3,
  durationMin: 45,
  subject: { name: "Ada Lovelace", nickname: "Ada", age: 36 },
  facts: ["Nació en 1815", "Le gustan los puzzles costeros"],
  eventTitle: "Caso Ada",
};

export const ADA_TEAM_EVENT: CreateEventRequest = {
  adventureType: "team",
  teamCount: 2,
  durationMin: 45,
  subject: { name: "Ada Lovelace", nickname: "Ada", age: 36 },
  facts: ["Nació en 1815", "Competición por equipos en el faro"],
  eventTitle: "Regata Ada",
};

export const ADA_CELEBRATION_EVENT: CreateEventRequest = {
  adventureType: "celebration",
  teamCount: 2,
  durationMin: 45,
  subject: { name: "Clara Vega", nickname: "Clara", age: 28 },
  facts: ["Aniversario 2020", "Le encanta bailar"],
  eventTitle: "Celebración Clara",
};

export type CreatedEvent = { joinCode: string; eventId: string };

export async function createEventViaRequest(
  request: APIRequestContext,
  body: CreateEventRequest,
): Promise<CreatedEvent> {
  const res = await request.post(`${API_BASE}/events`, { data: body });
  expect(res.ok(), await res.text().catch(() => "error")).toBeTruthy();
  const json = (await res.json()) as { preview: { joinCode: string; eventId: string } };
  expect(json.preview.joinCode).toMatch(/^[A-Z0-9]{6}$/);
  expect(json.preview.eventId).toBeTruthy();
  return { joinCode: json.preview.joinCode, eventId: json.preview.eventId };
}

export async function createEventViaApi(page: Page, body: CreateEventRequest): Promise<string> {
  const created = await createEventViaRequest(page.request, body);
  return created.joinCode;
}