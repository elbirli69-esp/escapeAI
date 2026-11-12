import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const contentRoot = join(dirname(fileURLToPath(import.meta.url)), "../../escape-content/rooms");
const pilotYaml = readFileSync(join(contentRoot, "pilot.yaml"), "utf8");

describe("talk_to_character", () => {
  it("permite hablar con personaje presente en escena", () => {
    const session = createSession(parseRoomDefinition(pilotYaml));
    const result = applyAction(session, {
      type: "talk_to_character",
      characterId: "night_concierge",
      message: " ¿Sabes algo del candado?",
    });
    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      { type: "character_talk", characterId: "night_concierge", message: "¿Sabes algo del candado?" },
    ]);
    expect(result.state.sceneCharacters?.[0]?.displayName).toContain("Conserje");
  });

  it("rechaza personaje ausente en otra escena", () => {
    const session = createSession(parseRoomDefinition(pilotYaml));
    const solved = applyAction(session, { type: "submit_answer", puzzleId: "lockbox", value: "1984" });
    expect(solved.ok).toBe(true);
    const move = applyAction(session, { type: "move", sceneId: "basement" });
    expect(move.ok).toBe(true);
    const talk = applyAction(session, {
      type: "talk_to_character",
      characterId: "night_concierge",
      message: "hola",
    });
    expect(talk.ok).toBe(false);
  });
});
