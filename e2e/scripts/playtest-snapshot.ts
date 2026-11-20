import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlaytestGrupoRuns } from "../fixtures/playtest-grupo-io.js";

const e2eRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(e2eRoot, "..");
const coveragePath = join(e2eRoot, "playtest-coverage.json");
const matrixPath = join(e2eRoot, "playtest-matrix.json");
const outPath = join(e2eRoot, ".cache", "playtest-snapshot.json");

type CoverageFile = {
  version: number;
  catalogRooms: Array<{
    roomId: string;
    priority: string;
    replaySpec: string;
    exploratorySpec: string | null;
    limitation?: string;
  }>;
  eventAdventureTypes: Array<{
    type: string;
    replaySpecs: string[];
    apiSpecs: string[];
  }>;
  commands: Record<string, string>;
};

function gitSha(): string {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "unknown";
}

function specExists(spec: string): boolean {
  return existsSync(join(e2eRoot, spec));
}

function runCommand(cmd: string): { ok: boolean; code: number | null } {
  const r = spawnSync(cmd, {
    shell: true,
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  return { ok: r.status === 0, code: r.status };
}

function countAuditFromReport(): { errors: number; warnings: number } | null {
  const reportPath = join(repoRoot, "docs", "coherencia-partidas-informe.md");
  if (!existsSync(reportPath)) return null;
  const text = readFileSync(reportPath, "utf8");
  const errors = (text.match(/^- ✗/gm) ?? []).length;
  const warnings = (text.match(/^- ⚠/gm) ?? []).length;
  return { errors, warnings };
}

function main(): void {
  const coverage = JSON.parse(readFileSync(coveragePath, "utf8")) as CoverageFile;
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8")) as { version: number; suites: unknown[] };

  const catalogCoverage = coverage.catalogRooms.map((room) => ({
    roomId: room.roomId,
    priority: room.priority,
    replay: { spec: room.replaySpec, present: specExists(room.replaySpec) },
    exploratory: room.exploratorySpec
      ? { spec: room.exploratorySpec, present: specExists(room.exploratorySpec) }
      : { spec: null, present: false, limitation: room.limitation ?? "N/D" },
  }));

  const eventCoverage = coverage.eventAdventureTypes.map((ev) => ({
    type: ev.type,
    replaySpecs: ev.replaySpecs.map((s) => ({ spec: s, present: specExists(s) })),
    apiSpecs: ev.apiSpecs.map((s) => ({ spec: s, present: specExists(s) })),
  }));

  const grupo = loadPlaytestGrupoRuns();
  const exploratoryRuns = grupo.runs.filter((r) => r.executionMode === "exploratory").length;
  const replayRuns = grupo.runs.filter((r) => r.executionMode === "deterministic_replay").length;

  const commandResults: Record<string, { ok: boolean; code: number | null }> = {};
  for (const [key, cmd] of Object.entries(coverage.commands)) {
    console.error(`[playtest-snapshot] ${cmd}`);
    commandResults[key] = runCommand(cmd);
  }

  const auditStats = countAuditFromReport();
  const snapshot = {
    generatedAt: new Date().toISOString(),
    gitSha: gitSha(),
    branch: spawnSync("git", ["branch", "--show-current"], { cwd: repoRoot, encoding: "utf8" }).stdout.trim(),
    playtestMatrixVersion: matrix.version,
    playtestCoverageVersion: coverage.version,
    catalogCoverage,
    eventCoverage,
    playtestGrupoRuns: {
      schemaVersion: grupo.schemaVersion,
      total: grupo.runs.length,
      exploratory: exploratoryRuns,
      deterministic_replay: replayRuns,
    },
    commandResults,
    auditCoherence: auditStats,
    suggestedInformeRefresh: "docs/playtest-grupo-informe.md §0 + snapshot path e2e/.cache/playtest-snapshot.json",
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2));

  const catalogGaps = catalogCoverage.filter((c) => !c.replay.present || (c.exploratory.spec && !c.exploratory.present));
  const commandsOk = Object.values(commandResults).every((c) => c.ok);

  console.log(JSON.stringify({ outPath, commandsOk, catalogGaps: catalogGaps.length, auditStats }, null, 2));
  if (!commandsOk) process.exit(1);
}

main();