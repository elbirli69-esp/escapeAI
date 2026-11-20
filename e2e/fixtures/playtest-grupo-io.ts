import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const cacheDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".cache");
export const playtestGrupoRunsPath = join(cacheDir, "playtest-grupo-runs.json");

export type PlaytestGrupoRun = {
  runId: string;
  timestamp: string;
  gitSha: string;
  roomId: string | null;
  eventId: string | null;
  adventureType: string | null;
  teamId: string;
  teamSize: number;
  teamProfile: string;
  executionMode: "exploratory" | "deterministic_replay" | "static_audit";
  won: boolean;
  partialWin: boolean;
  wrongAttempts: number;
  hintDependency: boolean;
  perceivedProgress: number | null;
  difficultyScore: number | null;
  hintsScore: number | null;
  llmStatus: string;
  evidence: string[];
  limitations: string[];
};

export type PlaytestGrupoFile = {
  schemaVersion: number;
  runs: PlaytestGrupoRun[];
};

function gitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export function loadPlaytestGrupoRuns(): PlaytestGrupoFile {
  if (!existsSync(playtestGrupoRunsPath)) {
    return { schemaVersion: 2, runs: [] };
  }
  return JSON.parse(readFileSync(playtestGrupoRunsPath, "utf8")) as PlaytestGrupoFile;
}

export function appendPlaytestGrupoRun(
  run: Omit<PlaytestGrupoRun, "runId" | "timestamp" | "gitSha">,
): void {
  mkdirSync(cacheDir, { recursive: true });
  const file = loadPlaytestGrupoRuns();
  file.runs.push({
    ...run,
    runId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    gitSha: gitSha(),
  });
  writeFileSync(playtestGrupoRunsPath, JSON.stringify(file, null, 2));
}