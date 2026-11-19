import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const pilotYaml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../escape-content/rooms/pilot.yaml"),
  "utf8",
);

describe("director_faq", () => {
  it("emite evento director_faq sin cambiar puzzles", () => {
    const session = createSession(parseRoomDefinition(pilotYaml));
    const before = session.solvedPuzzles.size;
    const result = applyAction(session, { type: "director_faq", faqId: "time_ok" });
    expect(result.ok).toBe(true);
    expect(result.events).toEqual([{ type: "director_faq", faqId: "time_ok" }]);
    expect(session.solvedPuzzles.size).toBe(before);
  });

  it("rechaza faq tras victoria", () => {
    const session = createSession(parseRoomDefinition(pilotYaml));
    session.status = "won";
    const result = applyAction(session, { type: "director_faq", faqId: "time_ok" });
    expect(result.ok).toBe(false);
  });
});