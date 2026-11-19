import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cacheDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".cache");
const metricsPath = join(cacheDir, "experience-metrics.json");

export type ProfileRuntimeMetrics = {
  timeToFirstPuzzleMs?: number;
  wrongAttemptFeedback?: boolean;
  wrongAttemptNoFlash?: boolean;
  gmLinesBeforeFirstSolve?: number;
  wonInE2e?: boolean;
  partialWin?: boolean;
  victoryBodyChars?: number;
  victoryIncludesTagline?: boolean;
  victoryIncludesRoomName?: boolean;
  scenesVisitedInWinSpec?: number;
};

export type ExperienceMetricsFile = {
  generatedAt: string;
  profiles: Record<string, ProfileRuntimeMetrics>;
};

export function loadMetrics(): ExperienceMetricsFile {
  if (!existsSync(metricsPath)) {
    return { generatedAt: "", profiles: {} };
  }
  return JSON.parse(readFileSync(metricsPath, "utf8")) as ExperienceMetricsFile;
}

export function mergeProfileMetrics(profileId: string, patch: ProfileRuntimeMetrics): void {
  mkdirSync(cacheDir, { recursive: true });
  const current = existsSync(metricsPath)
    ? (JSON.parse(readFileSync(metricsPath, "utf8")) as ExperienceMetricsFile)
    : { generatedAt: "", profiles: {} };
  current.profiles[profileId] = { ...current.profiles[profileId], ...patch };
  current.generatedAt = new Date().toISOString();
  writeFileSync(metricsPath, JSON.stringify(current, null, 2));
}

export function resetMetricsFile(): void {
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(
    metricsPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), profiles: {} }, null, 2),
  );
}

export const experienceMetricsPath = metricsPath;