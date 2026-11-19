import { expect, type Page } from "@playwright/test";

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

/** Modo foco de retos oculta pestañas; los flujos e2e necesitan la barra completa. */
export async function showAllPuzzleTabs(page: Page): Promise<void> {
  const focusBtn = page.getByTestId("escape-puzzle-focus");
  if (!(await focusBtn.isVisible({ timeout: 15_000 }).catch(() => false))) return;
  if ((await focusBtn.getAttribute("aria-pressed")) === "true") {
    await focusBtn.click();
    await expect(focusBtn).toHaveAttribute("aria-pressed", "false");
  }
}

export async function selectPuzzle(page: Page, puzzleId: string): Promise<void> {
  await showAllPuzzleTabs(page);
  const tab = page.getByTestId(`escape-puzzle-tab-${puzzleId}`);
  await expect(tab).toBeVisible({ timeout: 15_000 });
  await tab.click();
}

async function waitGameIdle(page: Page): Promise<void> {
  await expect(page.locator("main.shell.game")).toHaveAttribute("aria-busy", "false", {
    timeout: 30_000,
  });
}

export async function submitAnswer(page: Page, value: string): Promise<void> {
  await page.getByTestId("escape-answer-input").fill(value);
  await page.getByTestId("escape-submit-answer").click();
  await waitGameIdle(page);
}

export async function requestHint(page: Page): Promise<void> {
  const btn = page.getByTestId("escape-request-hint");
  await expect(btn).toBeEnabled({ timeout: 30_000 });
  await btn.click();
  await waitGameIdle(page);
}

export async function getSessionId(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem("escapeai.sessionId"));
}

/** Cumple el paso «listen» en retos de sonido (beeps, TTS o URL). */
export async function completeSoundListen(page: Page): Promise<void> {
  const play = page.getByRole("button", {
    name: /^(Reproducir pista|Escuchar mensaje|Reproducir audio)$/,
  });
  await expect(play).toBeVisible({ timeout: 15_000 });
  await play.click();

  const listenedBtn = page.getByRole("button", { name: "Escuchado" });
  const fallbackBeeps = page.getByRole("button", { name: "Pitidos de respaldo" });
  const beepPlay = page.getByRole("button", { name: "Reproducir pista" });

  const primaryOk = await listenedBtn
    .waitFor({ state: "visible", timeout: 12_000 })
    .then(() => true)
    .catch(() => false);
  if (primaryOk) return;

  // TTS sin voz en CI: pitidos de respaldo o botón de beeps directo.
  if (await fallbackBeeps.isVisible().catch(() => false)) {
    await fallbackBeeps.click();
  } else if (await beepPlay.isVisible().catch(() => false)) {
    await beepPlay.click();
  }

  await listenedBtn.waitFor({ state: "visible", timeout: 20_000 });
}

export async function expectNoFlashError(page: Page): Promise<void> {
  await expect(page.getByTestId("escape-flash-error")).not.toBeVisible({ timeout: 1500 });
}

export async function moveToScene(page: Page, sceneId: string): Promise<void> {
  const exit = page.getByTestId(`escape-exit-${sceneId}`);
  await expect(exit).toBeEnabled({ timeout: 15_000 });
  const actionDone = page.waitForResponse(
    (resp) =>
      resp.request().method() === "POST" &&
      resp.url().includes("/actions") &&
      resp.ok(),
  );
  await exit.click();
  await actionDone;
  await expect(exit).toBeHidden({ timeout: 15_000 });
}

export async function expectWon(page: Page): Promise<void> {
  await expect(page.getByTestId("escape-game-status")).toHaveAttribute("data-status", "won", {
    timeout: 30_000,
  });
}
