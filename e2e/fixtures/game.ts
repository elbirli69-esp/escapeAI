import { expect, type Page } from "@playwright/test";

const API = "http://127.0.0.1:8787/api";

export async function clearGameStorage(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
}

export async function openCatalog(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("escape-lobby-home").waitFor();
  await page.getByTestId("escape-mode-catalog").click();
}

export async function startClassicRoom(page: Page, roomId: string): Promise<void> {
  await openCatalog(page);
  await page.getByTestId(`escape-room-${roomId}`).click();
  await page.getByTestId("escape-start-classic").click();
  await expect(page.getByTestId("escape-start-classic")).toBeHidden({ timeout: 30_000 });
  await page.getByTestId(/escape-puzzle-tab-/).first().waitFor({ timeout: 30_000 });
}

export async function selectPuzzle(page: Page, puzzleId: string): Promise<void> {
  await page.getByTestId(`escape-puzzle-tab-${puzzleId}`).click();
}

export async function submitAnswer(page: Page, value: string): Promise<void> {
  await page.getByTestId("escape-answer-input").fill(value);
  await page.getByTestId("escape-submit-answer").click();
}

export async function expectNoFlashError(page: Page): Promise<void> {
  await expect(page.getByTestId("escape-flash-error")).not.toBeVisible({ timeout: 1500 });
}

export async function moveToScene(page: Page, sceneId: string): Promise<void> {
  const exit = page.getByTestId(`escape-exit-${sceneId}`);
  await expect(exit).toBeEnabled({ timeout: 15_000 });
  await exit.click();
}

export async function expectWon(page: Page): Promise<void> {
  await expect(page.getByTestId("escape-game-status")).toHaveAttribute("data-status", "won", {
    timeout: 30_000,
  });
}

export async function postAction(
  page: Page,
  action: Record<string, unknown>,
): Promise<void> {
  const sessionId = await page.evaluate(() => localStorage.getItem("escapeai.sessionId"));
  if (!sessionId) throw new Error("No sessionId in localStorage");
  const res = await page.request.post(`${API}/sessions/${sessionId}/actions`, {
    data: action,
  });
  expect(res.ok()).toBeTruthy();
  const puzzleId = String(action.puzzleId);
  await page.reload();
  await page.getByTestId(`escape-puzzle-tab-${puzzleId}`).waitFor({ timeout: 15_000 });
}
