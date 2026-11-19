import { test, expect } from "@playwright/test";
import { clearGameStorage, selectPuzzle, startClassicRoom, submitAnswer } from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

async function expectGmDiaryMatching(
  page: import("@playwright/test").Page,
  pattern: RegExp,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const texts = await page.getByTestId("escape-gm-line").allTextContents();
        return texts.some((t) => pattern.test(t));
      },
      { timeout: 30_000 },
    )
    .toBe(true);
}

async function expectNarrativeWithoutAnswer(page: import("@playwright/test").Page): Promise<void> {
  const log = await page.getByTestId("escape-narrative-log").innerText();
  expect(log).not.toContain("1984");
}

test.describe("GM diálogo ER — Caso A (atasco pilot, sin pista)", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
    await startClassicRoom(page, "pilot");
    await expect(page.getByTestId("escape-gm-line").first()).toBeVisible({ timeout: 15_000 });
  });

  test("fallos en candado: fail nudge y TEAM_STUCK sin revelar solución", async ({ page }) => {
    await selectPuzzle(page, "lockbox");

    await submitAnswer(page, "0000");
    await expectNarrativeWithoutAnswer(page);

    await submitAnswer(page, "1111");
    await expectGmDiaryMatching(page, /portal suena antes que el candado/i);
    await expectNarrativeWithoutAnswer(page);

    for (const code of ["2222", "3333", "4444"]) {
      await submitAnswer(page, code);
    }
    await expectGmDiaryMatching(page, /Pedir pista|conserje acaba de autorizar/i);
    const banner = page.getByTestId("escape-gm-banner");
    if (await banner.isVisible().catch(() => false)) {
      await expect(banner).not.toContainText("1984");
    }
    await expectNarrativeWithoutAnswer(page);

    const gmBeforeFaq = await page.getByTestId("escape-gm-line").count();
    await page.getByTestId("escape-director-faq-stuck_no_spoiler").click();
    await expect(page.locator("main.shell.game")).toHaveAttribute("aria-busy", "false", {
      timeout: 30_000,
    });
    await expect
      .poll(async () => page.getByTestId("escape-gm-line").count(), { timeout: 30_000 })
      .toBeGreaterThan(gmBeforeFaq);
    await expectNarrativeWithoutAnswer(page);
    await expect(page.getByTestId("escape-request-hint")).toBeEnabled();
  });
});