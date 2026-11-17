import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAdventureRoom, loadRoomById, ROOM_FILES, type RoomId } from "@escapeai/escape-content";
import matrix from "../experience-matrix.json" with { type: "json" };
import { experienceMetricsPath } from "../fixtures/experience-metrics-io.js";
import type { ExperienceMetricsFile, ProfileRuntimeMetrics } from "../fixtures/experience-metrics-io.js";
import {
  contentMetricsFromRoom,
  profileTotal,
  scoreChallenge,
  scoreClosure,
  scoreFlow,
  scoreFun,
  scoreHook,
  scoreVariety,
  type ContentMetrics,
  type DimensionScore,
} from "./experience-rubric.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, "..", ".cache");
const outScores = join(cacheDir, "experience-scores.json");
const playwrightJson = join(cacheDir, "playwright-results.json");
const repoRoot = join(__dirname, "../..");
const planPath = join(repoRoot, "docs", "experiencia-mejora-plan.md");

const EMPTY_CONTENT: ContentMetrics = {
  taglineWords: 0,
  firstSceneDescChars: 0,
  sessionStartedBeats: 0,
  beatCount: 0,
  sceneCount: 0,
  puzzleCount: 0,
  puzzleTypesDistinct: 0,
  sensoryTypeCount: 0,
  hasTimeLimit: false,
  winPathPuzzles: 0,
};

function loadPlaywrightSpecPass(relativeSpec: string): boolean | null {
  if (!existsSync(playwrightJson)) return null;
  const data = JSON.parse(readFileSync(playwrightJson, "utf8")) as {
    suites?: Array<{ specs?: Array<{ file: string; ok: boolean }> }>;
  };
  const fileName = relativeSpec.replace(/^specs\//, "");
  const walk = (suites: Array<{ file?: string; ok?: boolean; specs?: unknown[]; suites?: unknown[] }>): boolean | null => {
    for (const suite of suites) {
      if (suite.file?.endsWith(fileName) && typeof suite.ok === "boolean") return suite.ok;
      if (suite.specs?.length) {
        const inner = walk(suite.specs as typeof suites);
        if (inner != null) return inner;
      }
      if (suite.suites?.length) {
        const inner = walk(suite.suites as typeof suites);
        if (inner != null) return inner;
      }
    }
    return null;
  };
  return walk(data.suites ?? []);
  return null;
}

function profileSpecsPass(e2eSpecs: string[]): { allPass: boolean; details: string[] } {
  const details: string[] = [];
  let allPass = true;
  for (const spec of e2eSpecs) {
    const ok = loadPlaywrightSpecPass(spec);
    if (ok === false) allPass = false;
    details.push(`${spec}:${ok === null ? "unknown" : ok ? "ok" : "fail"}`);
  }
  if (!existsSync(playwrightJson)) {
    allPass = true;
  }
  return { allPass, details };
}

function contentForProfile(profileId: string, roomId: string | null): ContentMetrics {
  if (profileId === "event-generated") {
    const room = generateAdventureRoom({
      adventureType: "birthday",
      teamCount: 4,
      subject: { name: "Sara García", nickname: "Sara" },
      facts: ["Le encanta la playa de La Concha", "Año clave 1995"],
      eventTitle: "Misterio de Sara",
      durationMin: 45,
    });
    return contentMetricsFromRoom(room, "generated:birthday");
  }
  if (roomId && roomId in ROOM_FILES) {
    return contentMetricsFromRoom(loadRoomById(roomId as RoomId), roomId);
  }
  return { ...EMPTY_CONTENT };
}

const metrics: ExperienceMetricsFile = existsSync(experienceMetricsPath)
  ? (JSON.parse(readFileSync(experienceMetricsPath, "utf8")) as ExperienceMetricsFile)
  : { generatedAt: "", profiles: {} };

const results = matrix.profiles.map((profile) => {
  const roomId = "roomId" in profile ? (profile.roomId as string) : null;
  const content = contentForProfile(profile.id, roomId);
  const rt: ProfileRuntimeMetrics = metrics.profiles[profile.id] ?? {};
  const { allPass, details } = profileSpecsPass(profile.e2eSpecs);

  const weights = matrix.rubric.weights as Record<string, number>;
  const evaluateDimensions = profile.evaluateDimensions as string[] | undefined;

  const dimensions: Record<string, DimensionScore> = {
    hook: scoreHook(content, rt),
    fun: scoreFun(content, rt),
    challenge: scoreChallenge(content, rt),
    variety: scoreVariety(content),
    flow: scoreFlow(allPass, rt, profile.id),
    closure: scoreClosure(rt),
  };

  const dimIds =
    evaluateDimensions?.length ?
      evaluateDimensions
    : (Object.keys(weights) as Array<keyof typeof weights>);
  const weightsSub: Record<string, number> = {};
  const dimsSub: Record<string, DimensionScore> = {};
  for (const id of dimIds) {
    if (dimensions[id]) dimsSub[id] = dimensions[id];
    if (weights[id as string]) weightsSub[id as string] = weights[id as string];
  }
  let total = profileTotal(dimsSub, weightsSub);
  if (!allPass && existsSync(playwrightJson) && profile.priority === "P0") {
    total = Math.min(total, matrix.rubric.e2eFailCap);
  }

  const filteredDims =
    evaluateDimensions?.length ?
      Object.fromEntries(Object.entries(dimensions).filter(([k]) => evaluateDimensions.includes(k)))
    : dimensions;

  return {
    id: profile.id,
    label: profile.label,
    priority: profile.priority,
    weight: profile.weight,
    e2eSpecsPass: { allPass, details },
    contentMetrics: content,
    runtimeMetrics: rt,
    dimensions: filteredDims,
    total,
  };
});

let globalSum = 0;
let globalWeight = 0;
for (const r of results) {
  globalSum += r.total * r.weight;
  globalWeight += r.weight;
}
const globalScore = globalWeight > 0 ? Math.round((globalSum / globalWeight) * 100) / 100 : 0;

const payload = {
  generatedAt: new Date().toISOString(),
  scoringMode: "objective-v1",
  rubricVersion: rubricVersion(),
  matrixVersion: matrix.version,
  globalScore,
  globalWeightSum: globalWeight,
  profiles: results,
};

mkdirSync(cacheDir, { recursive: true });
writeFileSync(outScores, JSON.stringify(payload, null, 2));

writePlan(results, globalScore);
console.log(`Scores written to ${outScores}`);
console.log(JSON.stringify({ globalScore, profiles: results.length }, null, 2));

function rubricVersion(): number {
  return 1;
}

function writePlan(
  profiles: Array<{
    id: string;
    label: string;
    total: number;
    dimensions: Record<string, DimensionScore>;
  }>,
  global: number,
): void {
  const lines: string[] = [
    `# Plan de mejora (objetivo) — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Generado por \`pnpm experience-eval:score\`. Nota global **${global}/10**.`,
    "",
    "Cada ítem es accionable: subir **points** del componente hasta **maxPoints**.",
    "",
  ];

  for (const p of profiles) {
    lines.push(`## ${p.label} (\`${p.id}\`) — total **${p.total}/10**`);
    lines.push("");
    const gaps: Array<{ dim: string; component: DimensionScore["components"][number] }> = [];
    for (const [dimId, dim] of Object.entries(p.dimensions)) {
      for (const c of dim.components) {
        if (c.points < c.maxPoints - 0.01) {
          gaps.push({ dim: dimId, component: c });
        }
      }
    }
    gaps.sort(
      (a, b) =>
        b.component.maxPoints -
        b.component.points -
        (a.component.maxPoints - a.component.points),
    );
    if (gaps.length === 0) {
      lines.push("- Sin gaps: perfil en máximo según rúbrica actual.");
    } else {
      for (const g of gaps) {
        const delta = Math.round((g.component.maxPoints - g.component.points) * 100) / 100;
        lines.push(
          `1. **[${g.dim}] ${g.component.id}** (+${delta} pts posibles): ${g.component.improvementHint}`,
        );
        lines.push(`   - Evidencia: ${g.component.evidence}`);
      }
    }
    lines.push("");
  }

  mkdirSync(dirname(planPath), { recursive: true });
  writeFileSync(planPath, lines.join("\n"));
  console.log(`Plan written to ${planPath}`);
}