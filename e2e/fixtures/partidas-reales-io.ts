import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const cacheDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".cache");
const runsPath = join(cacheDir, "partidas-reales-runs.json");

export type PartidasRealesRun = {
  runId: string;
  timestamp: string;
  gitSha: string;
  executionMode: "real_session_exploratory" | "real_session_partial";
  gameKind: "catalog" | "event";
  roomId: string | null;
  adventureType: string | null;
  eventJoinCode: string | null;
  sessionId: string | null;
  teamId: string;
  playerModel: Record<string, number>;
  won: boolean;
  abandonedAt: string | null;
  timeToWinSec: number | null;
  metrics: Record<string, number | string | boolean | null>;
  verdicts: Record<string, { status: string; score: number; evidence?: string[] }>;
  globalVerdict: string;
  evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }>;
  llmStatus: string;
};

export type PartidasRealesFile = {
  schemaVersion: number;
  campaignId: string;
  runs: PartidasRealesRun[];
};

function gitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export function loadPartidasReales(): PartidasRealesFile {
  if (!existsSync(runsPath)) {
    return { schemaVersion: 1, campaignId: crypto.randomUUID(), runs: [] };
  }
  return JSON.parse(readFileSync(runsPath, "utf8")) as PartidasRealesFile;
}

export function appendPartidasRealesRun(run: Omit<PartidasRealesRun, "runId" | "timestamp" | "gitSha">): void {
  mkdirSync(cacheDir, { recursive: true });
  const file = loadPartidasReales();
  file.runs.push({
    ...run,
    runId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    gitSha: gitSha(),
  });
  writeFileSync(runsPath, JSON.stringify(file, null, 2));
}

export function resetPartidasRealesFile(): void {
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(
    runsPath,
    JSON.stringify({ schemaVersion: 1, campaignId: crypto.randomUUID(), runs: [] }, null, 2),
  );
}

export const partidasRealesPath = runsPath;