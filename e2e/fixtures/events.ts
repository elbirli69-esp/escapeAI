import { expect, type Page } from "@playwright/test";
import { showAllPuzzleTabs } from "./game.js";

export const SARA_EVENT = {
  adventureType: "birthday" as const,
  subjectName: "Sara García",
  nickname: "Sara",
  age: "",
  facts: "Le encanta la playa de La Concha\nSu canción es LUEGO\nAño clave 1995",
  eventTitle: "Misterio de Sara",
  teamCount: 4,
  durationMin: "45",
  yearLockAnswer: "1995",
};

export type CreateEventLobbyOpts = {
  hybridPlayMode?: "room" | "mobile_only";
};

export type CreatedEvent = { joinCode: string; eventId: string };

async function submitCreateEvent(page: Page): Promise<CreatedEvent> {
  const waitCreate = page.waitForResponse(
    (res) => res.url().includes("/api/events") && res.request().method() === "POST",
  );
  await page.getByTestId("escape-event-create-submit").click();
  const res = await waitCreate;
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as { preview: { joinCode: string; eventId: string } };
  await page.getByTestId("escape-join-code-display").waitFor({ timeout: 60_000 });
  const code = await page.getByTestId("escape-join-code-display").innerText();
  expect(code.trim()).toBe(data.preview.joinCode);
  return { joinCode: data.preview.joinCode.trim(), eventId: data.preview.eventId };
}

export async function createEventFromLobby(
  page: Page,
  opts?: CreateEventLobbyOpts,
): Promise<string> {
  await page.goto("/");
  await page.getByTestId("escape-lobby-home").waitFor();
  await page.getByTestId("escape-mode-create").click();

  await page.getByText("Homenaje personal", { exact: true }).click();
  await page.getByLabel(/Nombre central/).fill(SARA_EVENT.subjectName);
  await page.getByLabel(/Apodo/).fill(SARA_EVENT.nickname);
  await page.getByLabel(/Datos jugables/).fill(SARA_EVENT.facts);
  await page.getByLabel(/Título del evento/).fill(SARA_EVENT.eventTitle);
  await page.getByLabel(/Equipos/).fill(String(SARA_EVENT.teamCount));
  await page.getByLabel(/Duración/).selectOption(SARA_EVENT.durationMin);

  if (opts?.hybridPlayMode === "mobile_only") {
    await page.getByTestId("escape-hybrid-play-mode").selectOption("mobile_only");
  }

  const created = await submitCreateEvent(page);
  expect(created.joinCode).toMatch(/^[A-Z0-9]{6}$/);
  return created.joinCode;
}

export async function createMysteryEventFromLobby(page: Page): Promise<CreatedEvent> {
  await page.goto("/");
  await page.getByTestId("escape-lobby-home").waitFor();
  await page.getByTestId("escape-mode-create").click();
  await page.getByText("Misterio", { exact: true }).click();
  await page.getByLabel(/Nombre central/).fill(SARA_EVENT.subjectName);
  await page.getByLabel(/Apodo/).fill(SARA_EVENT.nickname);
  await page.getByLabel(/Datos jugables/).fill("Sospechoso en el muelle\nHora 23:00\nLlave perdida");
  await page.getByLabel(/Título del evento/).fill("Caso E2E");
  await page.getByLabel(/Equipos/).fill("2");
  await page.getByLabel(/Duración/).selectOption("45");
  return submitCreateEvent(page);
}

export async function joinEventAsTeam(
  page: Page,
  joinCode: string,
  teamName: string,
): Promise<void> {
  await page.goto("/");
  await page.getByTestId("escape-lobby-home").waitFor();
  await page.getByTestId("escape-mode-join").click();
  await page.getByTestId("escape-join-code-input").fill(joinCode);
  await page.getByLabel("Nombre del equipo").fill(teamName);
  await page.getByRole("button", { name: /Empezar partida del equipo/ }).click();
  await page.getByTestId(/escape-puzzle-tab-/).first().waitFor({ timeout: 30_000 });
  await showAllPuzzleTabs(page);
  await expect(page.getByTestId("escape-puzzle-tab-entry_lock")).toBeVisible({ timeout: 30_000 });
}
