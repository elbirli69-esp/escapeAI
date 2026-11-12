import { test, expect } from "@playwright/test";
import { clearGameStorage, openCatalog } from "../fixtures/game.js";

const API = "http://127.0.0.1:8787/api";

test.describe("smoke", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
  });

  test("health memory + catálogo con salas", async ({ page, request }) => {
    const health = await request.get(`${API}/health`);
    expect(health.ok()).toBeTruthy();
    const body = await health.json();
    expect(body.ok).toBe(true);
    expect(body.persistence).toBe("memory");

    await openCatalog(page);
    await expect(page.getByTestId("escape-room-pilot")).toBeVisible();
    await expect(page.getByTestId("escape-room-geo-lab")).toBeVisible();
  });

  test("respuesta incorrecta actualiza el diario", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("escape-mode-catalog").click();
    await page.getByTestId("escape-room-pilot").click();
    await page.getByTestId("escape-start-classic").click();
    await page.getByTestId("escape-answer-input").fill("0000");
    await page.getByTestId("escape-submit-answer").click();
    await expect(page.getByTestId("escape-narrative-log")).toContainText("incorrecta");
  });
});
