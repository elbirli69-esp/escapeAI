import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOM_CATALOG, ROOM_FILES, loadRoomById, type RoomId } from "@escapeai/escape-content";
import type { RoomDefinition } from "@escapeai/escape-engine";
import matrix from "../experience-matrix.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const e2eRoot = join(__dirname, "..");
const cacheDir = join(e2eRoot, ".cache");
const outPath = join(cacheDir, "experience-signals.json");

type PuzzleStats = {
  puzzleCount: number;
  sceneCount: number;
  puzzleTypes: string[];
  puzzleTypesDistinct: number;
  sensoryTypes: string[];
  hasTimeLimit: boolean;
  timeLimitSec?: number;
};

function collectRoomStats(room: RoomDefinition): PuzzleStats {
  const puzzles = Object.values(room.puzzles ?? {});
  const types = puzzles.map((p) => p.type);
  const distinct = new Set(types);
  const sensory = distinct.has("sound") || distinct.has("voice") || distinct.has("camera") || distinct.has("visual")
    ? [...distinct].filter((t) => ["sound", "voice", "camera", "visual", "geo"].includes(t))
    : distinct.has("geo")
      ? ["geo"]
      : [];

  return {
    puzzleCount: puzzles.length,
    sceneCount: Object.keys(room.scenes ?? {}).length,
    puzzleTypes: [...distinct],
    puzzleTypesDistinct: distinct.size,
    sensoryTypes: sensory,
    hasTimeLimit: Boolean(room.timeLimitSec),
    timeLimitSec: room.timeLimitSec,
  };
}

function varietySuggestion(stats: PuzzleStats): number {
  const ratio = stats.puzzleCount > 0 ? stats.puzzleTypesDistinct / stats.puzzleCount : 0;
  let score = 4 + ratio * 4;
  if (stats.sceneCount >= 3) score += 1;
  if (stats.sensoryTypes.length > 0) score += 0.5;
  return Math.min(10, Math.round(score * 10) / 10);
}

function challengeSuggestion(stats: PuzzleStats): number {
  let score = 5;
  score += Math.min(2, stats.puzzleCount * 0.25);
  score += Math.min(1.5, stats.sceneCount * 0.35);
  if (stats.hasTimeLimit) score += 1;
  return Math.min(10, Math.round(score * 10) / 10);
}

const profiles = matrix.profiles.map((profile) => {
  const roomId = "roomId" in profile ? (profile.roomId as RoomId) : undefined;
  const catalog = roomId ? ROOM_CATALOG.find((r) => r.id === roomId) : undefined;
  let stats: PuzzleStats | null = null;
  let suggestions: { variety?: number; challenge?: number } = {};

  if (roomId && roomId in ROOM_FILES) {
    const room = loadRoomById(roomId);
    stats = collectRoomStats(room);
    suggestions = {
      variety: varietySuggestion(stats),
      challenge: challengeSuggestion(stats),
    };
  }

  return {
    id: profile.id,
    label: profile.label,
    mode: profile.mode,
    roomId: roomId ?? null,
    priority: profile.priority,
    e2eSpecs: profile.e2eSpecs,
    catalog: catalog
      ? { title: catalog.title, tagline: catalog.tagline, theme: catalog.theme }
      : null,
    stats,
    scoreSuggestions: suggestions,
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  matrixVersion: matrix.version,
  rubricWeights: matrix.rubric.weights,
  profiles,
  catalogRoomCount: ROOM_CATALOG.length,
  distinctThemes: [...new Set(ROOM_CATALOG.map((r) => r.theme).filter(Boolean))],
};

mkdirSync(cacheDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2));

const matrixPath = join(e2eRoot, "experience-matrix.json");
readFileSync(matrixPath, "utf8");

console.log(`Experience signals written to ${outPath}`);
console.log(JSON.stringify({ profiles: profiles.length, catalogRoomCount: payload.catalogRoomCount }, null, 2));