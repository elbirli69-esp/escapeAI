import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matrix from "../experience-matrix.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const scoresPath = join(__dirname, "..", ".cache", "experience-scores.json");
const outPath = join(repoRoot, "docs", "experiencia-jugable-informe.md");

type ScoresFile = {
  generatedAt: string;
  globalScore: number;
  scoringMode: string;
  profiles: Array<{
    id: string;
    label: string;
    total: number;
    e2eSpecsPass: { allPass: boolean };
    dimensions: Record<
      string,
      { score: number; components: Array<{ id: string; points: number; maxPoints: number; evidence: string }> }
    >;
  }>;
};

if (!existsSync(scoresPath)) {
  console.error("Missing experience-scores.json — run pnpm experience-eval:score");
  process.exit(1);
}

const scores = JSON.parse(readFileSync(scoresPath, "utf8")) as ScoresFile;
const dimIds = matrix.dimensions.map((d) => d.id);
const dimLabels = matrix.dimensions.map((d) => d.label);

const rows = scores.profiles
  .map((p) => {
    const cols = dimIds.map((id) => {
      const v = p.dimensions[id]?.score;
      return v != null ? v.toFixed(1).replace(".", ",") : "—";
    });
    const e2e = p.e2eSpecsPass.allPass ? "ok" : "fail";
    return `| ${p.label} | ${cols.join(" | ")} | **${p.total.toFixed(1).replace(".", ",")}** | ${e2e} |`;
  })
  .join("\n");

const breakdown = scores.profiles
  .map((p) => {
    const lines = [`### ${p.label} — desglose objetivo`, ""];
    for (const dimId of dimIds) {
      const d = p.dimensions[dimId];
      if (!d) continue;
      lines.push(`**${dimId}** = ${d.score}/10`);
      for (const c of d.components) {
        lines.push(`- \`${c.id}\`: ${c.points}/${c.maxPoints} — ${c.evidence}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  })
  .join("\n");

const md = `# Informe experiencia jugable — ${new Date().toISOString().slice(0, 10)}

Modo: **${scores.scoringMode}** (sin ajuste manual del agente). Fuente: \`e2e/.cache/experience-scores.json\`.

## Resumen ejecutivo

- **Nota global: ${scores.globalScore.toFixed(1).replace(".", ",")} / 10**
- Plan de mejora: [experiencia-mejora-plan.md](./experiencia-mejora-plan.md)
- Rúbrica: [e2e/rubric-components.json](../e2e/rubric-components.json)

## Matriz de notas

| Perfil | ${dimLabels.join(" | ")} | **Total** | e2e |
| ------ | ${matrix.dimensions.map(() => "---").join(" | ")} | --- | --- |
${rows}

## Desglose por componentes

${breakdown}

## Checklist

- [x] Puntuación determinista (\`experience-score.ts\`)
- [x] Métricas runtime (\`experience-metrics.spec.ts\`)
- [ ] Revisar plan de mejora y priorizar en backlog
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, md);
console.log(`Report: ${outPath}`);