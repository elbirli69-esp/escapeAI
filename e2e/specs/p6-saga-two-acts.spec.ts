import { test, expect } from "@playwright/test";
import { generateAdventureRoom } from "@escapeai/escape-content";
import {
  completeSoundListen,
  expectWon,
  moveToScene,
  selectPuzzle,
  showAllPuzzleTabs,
  submitAnswer,
} from "../fixtures/game.js";

const apiBase = "http://127.0.0.1:8787/api";

const eventInput = {
  adventureType: "birthday" as const,
  teamCount: 2,
  durationMin: 45 as const,
  hybridPlayMode: "mobile_only" as const,
  sagaTwoActs: true,
  subject: { name: "Marta López", nickname: "Marta" },
  facts: ["Le gusta el jazz", "Clave 1990"],
  eventTitle: "Saga E2E",
};

test.describe.serial("P6-D saga dos actos", () => {
  test.describe.configure({ timeout: 180_000 });

  let joinCode: string;
  let eventId: string;
  let answers: {
    sound: string;
    entry: string;
    final: string;
    rescue: string;
  };

  test("configura evento con saga", async ({ request }) => {
    const res = await request.post(`${apiBase}/events`, { data: eventInput });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { preview: { joinCode: string; eventId: string } };
    joinCode = body.preview.joinCode;
    eventId = body.preview.eventId;
    const room = generateAdventureRoom(eventInput, eventId);
    answers = {
      sound: room.puzzles.sound_intro!.answer!,
      entry: room.puzzles.entry_lock!.answer!,
      final: room.puzzles.final_code!.answer!,
      rescue: room.puzzles.saga_rescue_code!.answer!,
    };
  });

  test("acto 1 sin victoria; rescate tras liberar organizador", async ({ page, request }) => {
    const joinRes = await request.post(`${apiBase}/events/${joinCode}/teams`, {
      data: { displayName: "Equipo Saga" },
    });
    expect(joinRes.ok()).toBeTruthy();
    const { teamId } = (await joinRes.json()) as { teamId: string };

    const startRes = await request.post(`${apiBase}/sessions`, {
      data: { eventCode: joinCode, teamId },
    });
    expect(startRes.ok()).toBeTruthy();
    const { sessionId } = (await startRes.json()) as { sessionId: string };

    await page.addInitScript((id) => {
      localStorage.setItem("escapeai.sessionId", id);
      sessionStorage.setItem("escapeai.autoResume", "1");
    }, sessionId);
    await page.goto("/");
    await page.getByTestId(/escape-puzzle-tab-/).first().waitFor({ timeout: 30_000 });

    await selectPuzzle(page, "sound_intro");
    await completeSoundListen(page);
    await submitAnswer(page, answers.sound);
    await selectPuzzle(page, "entry_lock");
    await submitAnswer(page, answers.entry);
    await moveToScene(page, "middle");

    await page.getByRole("button", { name: "Coger" }).click();
    await selectPuzzle(page, "token_slot");
    await page.getByRole("button", { name: "Usar" }).click();
    await moveToScene(page, "finale");

    await selectPuzzle(page, "final_code");
    await submitAnswer(page, answers.final);

    await expect(page.getByTestId("escape-game-status")).not.toBeVisible();
    await showAllPuzzleTabs(page);

    const exitAct2 = page.getByTestId("escape-exit-finale_b");
    await expect(exitAct2).toBeVisible({ timeout: 15_000 });
    await expect(exitAct2).toBeDisabled();

    const release = await request.post(`${apiBase}/events/${joinCode}/saga-release-act2`);
    expect(release.ok()).toBeTruthy();

    await page.reload();
    await page.getByTestId(/escape-puzzle-tab-/).first().waitFor({ timeout: 30_000 });

    await expect(exitAct2).toBeEnabled({ timeout: 15_000 });
    await moveToScene(page, "finale_b");
    await selectPuzzle(page, "saga_rescue_code");
    await submitAnswer(page, answers.rescue);
    await expectWon(page);
  });
});