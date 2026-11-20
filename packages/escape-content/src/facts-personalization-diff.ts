import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CreateEventRequest } from "@escapeai/shared";
import type { RoomDefinition } from "@escapeai/escape-engine";
import { generateAdventureRoom } from "./generate-adventure.js";
import { auditGeneratedClueLedger } from "./audit-coherence.js";

const FIXED_EVENT_ID =
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" as `${string}-${string}-${string}-${string}-${string}`;

const BASE_INPUT: CreateEventRequest = {
  adventureType: "birthday",
  teamCount: 2,
  durationMin: 45,
  subject: { name: "Elena Ruiz", nickname: "Elena", age: 30 },
  facts: ["Año clave 1995", "Le encanta la playa"],
  eventTitle: "Homenaje Elena",
  hybridPlayMode: "mobile_only",
};

const VARIANT_INPUT: CreateEventRequest = {
  ...BASE_INPUT,
  facts: ["Año clave 2001", "Le encanta el jazz"],
};

type DiffEntry = {
  path: string;
  kind: "functional" | "superficial";
  valueA: string;
  valueB: string;
};

function collectPuzzleSnapshots(room: RoomDefinition): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, puzzle] of Object.entries(room.puzzles)) {
    out[`puzzles.${id}.answer`] = String(puzzle.answer ?? "");
    out[`puzzles.${id}.prompt`] = (puzzle.prompt ?? "").slice(0, 200);
    const hint0 = puzzle.hints?.[0]?.text ?? "";
    out[`puzzles.${id}.hint1`] = hint0.slice(0, 160);
  }
  const start = room.scenes.start;
  if (start) {
    out["scenes.start.description"] = start.description.trim().slice(0, 240);
  }
  out["winCondition"] = JSON.stringify(room.winCondition);
  return out;
}

function classify(path: string): "functional" | "superficial" {
  if (path.includes(".answer") || path.includes("winCondition")) return "functional";
  if (path.includes("description") || path.includes(".prompt") || path.includes(".hint1")) {
    return "functional";
  }
  return "superficial";
}

export function diffGeneratedRooms(
  inputA: CreateEventRequest,
  inputB: CreateEventRequest,
  eventId = FIXED_EVENT_ID,
): { diffs: DiffEntry[]; auditA: { ok: boolean }; auditB: { ok: boolean } } {
  const roomA = generateAdventureRoom(inputA, eventId);
  const roomB = generateAdventureRoom(inputB, eventId);
  const snapA = collectPuzzleSnapshots(roomA);
  const snapB = collectPuzzleSnapshots(roomB);
  const keys = new Set([...Object.keys(snapA), ...Object.keys(snapB)]);
  const diffs: DiffEntry[] = [];
  for (const path of [...keys].sort()) {
    const valueA = snapA[path] ?? "";
    const valueB = snapB[path] ?? "";
    if (valueA !== valueB) {
      diffs.push({ path, kind: classify(path), valueA, valueB });
    }
  }
  return {
    diffs,
    auditA: auditGeneratedClueLedger(roomA),
    auditB: auditGeneratedClueLedger(roomB),
  };
}

function main(): void {
  const result = diffGeneratedRooms(BASE_INPUT, VARIANT_INPUT);
  const functional = result.diffs.filter((d) => d.kind === "functional");
  const superficial = result.diffs.filter((d) => d.kind === "superficial");

  const report = {
    generatedAt: new Date().toISOString(),
    eventId: FIXED_EVENT_ID,
    inputA: { facts: BASE_INPUT.facts },
    inputB: { facts: VARIANT_INPUT.facts },
    summary: {
      totalDiffs: result.diffs.length,
      functional: functional.length,
      superficial: superficial.length,
      clueLedgerA: result.auditA,
      clueLedgerB: result.auditB,
    },
    functional,
    superficial,
    all: result.diffs,
  };

  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const outDir = join(root, "e2e", ".cache");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "facts-personalization-diff.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  const ok =
    functional.length >= 2 &&
    result.auditA.ok &&
    result.auditB.ok &&
    functional.some((d) => d.path.includes("entry_lock"));
  console.log(JSON.stringify({ ok, outPath, summary: report.summary }, null, 2));
  if (!ok) process.exit(1);
}

const isCli = process.argv[1]?.includes("facts-personalization-diff");
if (isCli) main();