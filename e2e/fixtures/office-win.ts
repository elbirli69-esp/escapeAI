import { expect, type Page } from "@playwright/test";
import {
  completeSoundListen,
  expectWon,
  moveToScene,
  selectPuzzle,
  submitAnswer,
} from "./game.js";

export async function playOfficeToWin(page: Page): Promise<void> {
  await selectPuzzle(page, "turnstile_tone");
  await completeSoundListen(page);
  await submitAnswer(page, "2");

  await selectPuzzle(page, "audit_year");
  await submitAnswer(page, "2024");
  await moveToScene(page, "open_space");

  await selectPuzzle(page, "budget_chart");
  const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
  await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
  await viewBtn.click();
  await submitAnswer(page, "3");

  await selectPuzzle(page, "shredder_tray");
  await submitAnswer(page, "IRAS");

  await moveToScene(page, "archive");
  await selectPuzzle(page, "badge_log");
  await submitAnswer(page, "CFO");

  await moveToScene(page, "open_space");
  await moveToScene(page, "boardroom");
  await selectPuzzle(page, "office_accusation");
  await expect(page.getByTestId("escape-whodunit-panel")).toBeVisible();
  await page.getByTestId("escape-whodunit-suspect-cfo").click();
  await page.getByTestId("escape-whodunit-submit").click();
  await expectWon(page);
}