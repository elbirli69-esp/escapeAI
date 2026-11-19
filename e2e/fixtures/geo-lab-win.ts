import { expect, type Page } from "@playwright/test";
import { expectWon, moveToScene, selectPuzzle, submitAnswer } from "./game.js";

export async function confirmGeoLocation(page: Page): Promise<void> {
  await page
    .locator(".location-station")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await page.getByRole("button", { name: "Estoy aquí" }).click();
}

/** Victoria completa geo-lab con intento fallido en pedestal (métricas fail-forward). */
export async function playGeoLabToWin(page: Page, opts?: { quizWrongCity?: boolean }): Promise<void> {
  await selectPuzzle(page, "llegar_sol");
  await confirmGeoLocation(page);

  await moveToScene(page, "plaza_clue");
  await selectPuzzle(page, "pedestal_code");
  await submitAnswer(page, "CAT");
  await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, {
    timeout: 10_000,
  });
  await submitAnswer(page, "OSO");

  await moveToScene(page, "galeria_rally");
  await selectPuzzle(page, "cartel_visual");
  const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
  await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
  await viewBtn.click();
  await submitAnswer(page, "5");

  await page.getByRole("button", { name: "Coger" }).click();
  await selectPuzzle(page, "pin_board");
  await page.getByRole("button", { name: "Usar" }).click();

  await moveToScene(page, "quiz_zone");
  await selectPuzzle(page, "ciudad_quiz");
  await confirmGeoLocation(page);
  if (opts?.quizWrongCity !== false) {
    await submitAnswer(page, "barcelona");
    await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, {
      timeout: 10_000,
    });
  }
  await submitAnswer(page, "madrid");
  await expectWon(page);
}