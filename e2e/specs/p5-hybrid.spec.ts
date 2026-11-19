import { test, expect } from "@playwright/test";
import {
  SARA_EVENT,
  createEventFromLobby,
  joinEventAsTeam,
} from "../fixtures/events.js";
import { playGeneratedThroughAct1 } from "../fixtures/generated-event.js";
import {
  clearGameStorage,
  expectNoFlashError,
  selectPuzzle,
  submitAnswer,
} from "../fixtures/game.js";
import { captureCameraThroughUi, mockCameraForPlaywright } from "../fixtures/media-mock.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

const apiBase = "http://127.0.0.1:8787/api";

test.describe.serial("P5 híbrido sala↔móvil", () => {
  test.describe.configure({ timeout: 180_000 });
  let joinCodeRoom: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    joinCodeRoom = await createEventFromLobby(page, { hybridPlayMode: "room" });
    await page.close();
  });

  test("API leaderboard expone prepChecklist y posterKeyword", async ({ request }) => {
    const lb = await request.get(`${apiBase}/events/${joinCodeRoom}/leaderboard`);
    expect(lb.ok()).toBeTruthy();
    const body = (await lb.json()) as {
      prepChecklist?: { kind: string; text: string }[];
      posterKeyword?: string;
      hybridPlayMode?: string;
    };
    expect(body.hybridPlayMode).toBe("room");
    expect((body.prepChecklist?.length ?? 0) > 2).toBeTruthy();
    expect(body.prepChecklist?.some((i) => /recuerdo|cartel|QR/i.test(i.text))).toBeTruthy();
    expect(body.posterKeyword).toMatch(/^[A-Z]{2}$/);
  });

  test("panel organizador muestra ficha Qué preparar", async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    await page.goto("/");
    await page.getByTestId("escape-mode-organizer").click();
    await page.getByTestId("escape-organizer-code-input").fill(joinCodeRoom);
    await page.getByTestId("escape-organizer-open").click();
    await expect(page.getByTestId("escape-organizer-prep")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("escape-organizer-poster")).toBeVisible();
    await expect(page.getByTestId("escape-organizer-poster")).toContainText(/[A-Z]{2}/);
    await expect(page.getByTestId("escape-organizer-prep")).toContainText(/Sala en casa/i);
  });

  test("acto 2: paso sala antes de cámara y recoger token", async ({ page }) => {
    await stubMediaRoutes(page);
    await mockCameraForPlaywright(page);
    await clearGameStorage(page);
    await joinEventAsTeam(page, joinCodeRoom, "Equipo Híbrido");
    await playGeneratedThroughAct1(page);

    await selectPuzzle(page, "camera_hunt");
    await expect(page.getByTestId("escape-hybrid-station")).toBeVisible();
    await expect(page.getByTestId("escape-camera-capture")).not.toBeVisible();

    await page.getByTestId("escape-hybrid-sala-confirm").click();
    await expect(page.getByTestId("escape-narrative-log")).toContainText(/sala confirmada/i, {
      timeout: 10_000,
    });

    await captureCameraThroughUi(page);
    await submitAnswer(page, SARA_EVENT.nickname.toUpperCase());
    await expectNoFlashError(page);

    const takeBtn = page.getByRole("button", { name: "Coger" });
    await expect(takeBtn).toBeEnabled({ timeout: 10_000 });
    await takeBtn.click();
    await expect(page.getByRole("button", { name: "Usar" })).toBeVisible({ timeout: 10_000 });
  });

  test("mobile_only: coger token sin cámara", async ({ browser }) => {
    const setup = await browser.newPage();
    await stubMediaRoutes(setup);
    await clearGameStorage(setup);
    const joinCodeMobile = await createEventFromLobby(setup, { hybridPlayMode: "mobile_only" });
    await setup.close();

    const page = await browser.newPage();
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    await joinEventAsTeam(page, joinCodeMobile, "Solo Móvil");
    await playGeneratedThroughAct1(page);

    const takeBtn = page.getByRole("button", { name: "Coger" });
    await expect(takeBtn).toBeEnabled({ timeout: 10_000 });
    await takeBtn.click();
    await expect(page.getByRole("button", { name: "Usar" })).toBeVisible({ timeout: 10_000 });
  });
});