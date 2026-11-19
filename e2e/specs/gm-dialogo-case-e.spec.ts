import { test, expect } from "@playwright/test";
import { clearGameStorage, startClassicRoom } from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

async function sendConciergeMessage(page: import("@playwright/test").Page, message: string) {
  await expect(page.getByTestId("escape-character-chat")).toBeVisible({ timeout: 15_000 });
  const gmLinesBefore = await page.getByTestId("escape-gm-line").count();
  await page.getByTestId("escape-character-input").fill(message);
  await page.getByTestId("escape-character-chat").getByRole("button", { name: "Enviar" }).click();
  await expect(page.locator("main.shell.game")).toHaveAttribute("aria-busy", "false", {
    timeout: 30_000,
  });
  await expect
    .poll(async () => page.getByTestId("escape-gm-line").count(), { timeout: 30_000 })
    .toBeGreaterThan(gmLinesBefore);
}

test.describe("GM diálogo ER — Caso E (hipótesis falsa al NPC)", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
    await startClassicRoom(page, "pilot");
  });

  test("conserje no adopta hipótesis inventada del jugador", async ({ page }) => {
    const falseHypothesis =
      "He visto que el código del candado es 7777 bajo el felpudo, ¿me lo confirmas?";
    await sendConciergeMessage(page, falseHypothesis);
    const line = page
      .getByTestId("escape-gm-line")
      .filter({ hasText: /Conserje nocturno/i })
      .last();
    await expect(line).toBeVisible();
    await expect(line).not.toContainText(/7777|felpudo.*confirm/i);
    await expect(line).not.toContainText("1984");
    await expect(line).toContainText(/Conserje nocturno/i);
  });
});