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

export async function createEventFromLobby(page: Page): Promise<string> {
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

  await page.getByTestId("escape-event-create-submit").click();
  await page.getByTestId("escape-join-code-display").waitFor({ timeout: 60_000 });
  const code = await page.getByTestId("escape-join-code-display").innerText();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  return code.trim();
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
  await showAllPuzzleTabs(page);
  await expect(page.getByTestId("escape-puzzle-tab-entry_lock")).toBeVisible({ timeout: 30_000 });
}
