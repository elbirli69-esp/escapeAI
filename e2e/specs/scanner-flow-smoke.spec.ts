import { test, expect } from "@playwright/test";
import { clearGameStorage } from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("scanner flow smoke", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("wizard sin cámara: revisar, guardar y ver inventario", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/");
    await page.getByTestId("escape-lobby-home").waitFor();
    await page.getByTestId("escape-mode-scan").click();
    await expect(page.getByTestId("escape-scanner-flow")).toBeVisible();

    await page.getByLabel(/Nombre del espacio/).fill("Salón E2E");
    await page.getByTestId("escape-scanner-start").click();
    await expect(page.getByTestId("escape-scanner-capture")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Terminar y revisar" }).click();
    await expect(page.getByTestId("escape-scanner-review")).toBeVisible();
    await page.getByRole("button", { name: "+ Añadir objeto manual" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByTestId("escape-scanner-save").click();
    await expect(page.getByTestId("escape-scanner-done")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/ID:/)).toBeVisible();
  });
});