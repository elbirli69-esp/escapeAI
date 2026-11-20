import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const e2eRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const matrixPath = join(e2eRoot, "playtest-matrix.json");

type Suite = { id: string; label: string; specs: string[] };

const matrix = JSON.parse(readFileSync(matrixPath, "utf8")) as {
  suites: Suite[];
};

function printUsage(): void {
  console.error("Uso: tsx scripts/playtest-replay.ts <suiteId>");
  console.error("Suites:", matrix.suites.map((s) => s.id).join(", "));
}

const suiteId = process.argv.slice(2).find((a) => a !== "--");
if (!suiteId) {
  printUsage();
  process.exit(1);
}

const suite = matrix.suites.find((s) => s.id === suiteId);
if (!suite) {
  console.error(`Suite desconocida: ${suiteId}`);
  printUsage();
  process.exit(1);
}

console.error(`[playtest-replay] ${suite.label} (${suite.specs.length} specs)`);

const result = spawnSync(
  "npx",
  ["playwright", "test", ...suite.specs],
  { cwd: e2eRoot, stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);