import { describe, expect, it } from "vitest";
import { applyAction, createSession } from "@escapeai/escape-engine";
import { generateAdventureRoom } from "./generate-adventure.js";

const baseInput = {
  adventureType: "team" as const,
  teamCount: 2,
  subject: { name: "Equipo Alfa", nickname: "Alfa" },
  facts: ["Ensayo 2024", "Muestra B7"],
  hybridPlayMode: "mobile_only" as const,
  asymmetricRoles: true,
};

describe("P6-B asymmetric roles", () => {
  it("middle expone puzzles por rol y fusión cooperativa", () => {
    const room = generateAdventureRoom(baseInput, "11111111-2222-3333-4444-555555555555");
    expect(room.scenes.middle?.puzzles).toEqual([
      "role_research_vial",
      "role_field_sample",
      "coop_serum",
    ]);
    expect(room.puzzles.role_research_vial?.visibleToRoles).toEqual(["researcher"]);
    expect(room.puzzles.role_field_sample?.visibleToRoles).toEqual(["field"]);
  });

  it("ningún rol resuelve el suero sin pista del otro", () => {
    const room = generateAdventureRoom(baseInput, "11111111-2222-3333-4444-555555555555");
    const researcher = createSession(room, {
      displayName: "Lab",
      eventId: "e1",
      playerId: "m1",
      teamId: "t1",
      joinCode: "ABC",
      slot: 0,
      playerRole: "researcher",
      asymmetricRoles: true,
    });
    const field = createSession(room, {
      displayName: "Campo",
      eventId: "e1",
      playerId: "m2",
      teamId: "t1",
      joinCode: "ABC",
      slot: 0,
      playerRole: "field",
      asymmetricRoles: true,
    });

    const sound = room.puzzles.sound_intro!.answer!;
    const entry = room.puzzles.entry_lock!.answer!;

    while (researcher.currentSceneId === "start") {
      applyAction(researcher, { type: "submit_answer", puzzleId: "sound_intro", value: sound });
      applyAction(researcher, { type: "submit_answer", puzzleId: "entry_lock", value: entry });
      applyAction(researcher, { type: "move", sceneId: "middle" });
    }
    while (field.currentSceneId === "start") {
      applyAction(field, { type: "submit_answer", puzzleId: "sound_intro", value: sound });
      applyAction(field, { type: "submit_answer", puzzleId: "entry_lock", value: entry });
      applyAction(field, { type: "move", sceneId: "middle" });
    }

    const labAnswer = room.puzzles.role_research_vial!.answer!;
    const fieldAnswer = room.puzzles.role_field_sample!.answer!;

    applyAction(researcher, { type: "submit_answer", puzzleId: "role_research_vial", value: labAnswer });
    expect(researcher.grantedClues.has("role_lab_seq")).toBe(true);

    const fusionOnlyResearcher = applyAction(researcher, {
      type: "submit_answer",
      puzzleId: "coop_serum",
      value: room.puzzles.coop_serum!.answer!,
    });
    expect(fusionOnlyResearcher.ok).toBe(false);

    applyAction(field, { type: "submit_answer", puzzleId: "role_field_sample", value: fieldAnswer });
    field.teamGrantedClues.set("role_lab_seq", researcher.grantedClues.get("role_lab_seq")!);
    researcher.teamGrantedClues.set("role_field_seq", field.grantedClues.get("role_field_seq")!);

    const fusion = applyAction(researcher, {
      type: "submit_answer",
      puzzleId: "coop_serum",
      value: room.puzzles.coop_serum!.answer!,
    });
    expect(fusion.ok).toBe(true);
  });
});