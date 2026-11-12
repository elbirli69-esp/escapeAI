import { describe, expect, it } from "vitest";
import { generateAdventureRoom } from "@escapeai/escape-content";
import { createSession } from "@escapeai/escape-engine";
import { assertGmViewContextSafe, buildGmViewContext } from "./context.js";

describe("buildGmViewContext security", () => {
  it("no incluye respuestas ni prompts de puzzles", () => {
    const room = generateAdventureRoom(
      {
        adventureType: "birthday",
        teamCount: 2,
        durationMin: 45,
        subject: { name: "Test", nickname: "Te" },
        facts: ["dato", "1999"],
      },
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
    const session = createSession(room);
    const puzzle = room.puzzles.entry_lock;
    expect(puzzle.answer).toBeTruthy();

    const context = buildGmViewContext(session, [], [], []);
    const blob = JSON.stringify(context);
    expect(blob).not.toContain(puzzle.answer!);
    expect(blob).not.toContain("puzzle.prompt");
    expect(context.activePuzzleLabels.length).toBeGreaterThan(0);

    expect(blob).not.toContain(puzzle.answer!);
    expect(blob).not.toContain(room.puzzles.final_code?.answer ?? "§");
    const leaks = assertGmViewContextSafe(context, [puzzle.answer!]);
    expect(leaks).toEqual([]);
  });

  it("no filtra puzzle.prompt aunque el YAML lo revele", () => {
    const room = generateAdventureRoom(
      {
        adventureType: "birthday",
        teamCount: 2,
        durationMin: 45,
        subject: { name: "Test" },
        facts: ["dato", "1999"],
      },
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    );
    const session = createSession(room);
    const dangerousPrompt = room.puzzles.entry_lock.prompt;
    expect(dangerousPrompt).toContain("código");

    const ctx = buildGmViewContext(session, [], [], []);
    expect(JSON.stringify(ctx)).not.toContain(room.puzzles.entry_lock.answer!);
    expect(ctx.activePuzzleLabels).toContain("Primer candado");
  });
});
