import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matrix from "../experience-matrix.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const signalsPath = join(__dirname, "..", ".cache", "experience-signals.json");
const outPath = join(repoRoot, "docs", "experiencia-jugable-informe.md");

const signals = existsSync(signalsPath)
  ? (JSON.parse(readFileSync(signalsPath, "utf8")) as {
      generatedAt: string;
      profiles: Array<{
        id: string;
        label: string;
        scoreSuggestions: { variety?: number; challenge?: number };
        stats: { puzzleTypesDistinct: number; puzzleCount: number } | null;
      }>;
    })
  : null;

const dimHeaders = matrix.dimensions.map((d) => d.label).join(" | ");
const dimPlaceholders = matrix.dimensions.map(() => "—").join(" | ");

const profileRows = matrix.profiles
  .map((p) => {
    const sig = signals?.profiles.find((s) => s.id === p.id);
    const hint =
      sig?.scoreSuggestions.variety != null
        ? `_(sugerencia variedad ${sig.scoreSuggestions.variety}, reto ${sig.scoreSuggestions.challenge ?? "—"})_`
        : "_sin sala YAML_";
    return `| ${p.label} | ${dimPlaceholders} | **—** | ⏳ | ${hint} |`;
  })
  .join("\n");

const md = `# Informe experiencia jugable — ${new Date().toISOString().slice(0, 10)}

> Generado por \`pnpm experience-eval:report\`. **Completar notas y evidencias** siguiendo [prompt-e2e-experiencia-jugable.md](./prompt-e2e-experiencia-jugable.md).

## Resumen ejecutivo

- Nota global: **— / 10**
- Perfiles en matriz: ${matrix.profiles.length}
- Señales objetivas: ${signals ? signals.generatedAt : "ejecutar `pnpm experience-eval:signals`"}
- Veredicto: _pendiente_

## Matriz de notas

| Perfil | ${dimHeaders} | **Total** | e2e | Sugerencias |
| ------ | ${matrix.dimensions.map(() => "---").join(" | ")} | --- | --- | --- |
${profileRows}

### Fórmula

\`nota_perfil = Σ (nota_dim × peso)\` con pesos: hook ${matrix.rubric.weights.hook}, fun ${matrix.rubric.weights.fun}, challenge ${matrix.rubric.weights.challenge}, variety ${matrix.rubric.weights.variety}, flow ${matrix.rubric.weights.flow}, closure ${matrix.rubric.weights.closure}.

Si e2e falla: cap ${matrix.rubric.e2eFailCap}/10 en ese perfil.

## Variedad cross-modo

- Salas catálogo: ${signals?.profiles.filter((p) => p.stats).length ?? "—"} con stats YAML
- Auditoría tipos evento: \`${matrix.adventureTypeVarietyAudit.command}\` → ${matrix.adventureTypeVarietyAudit.types.join(", ")}

## Mejoras por juego

${matrix.profiles
  .filter((p) => p.priority === "P0" || p.priority === "P1")
  .map((p) => `### ${p.label}\n1. _pendiente_\n`)
  .join("\n")}

## Mejoras experiencia completa

1. _pendiente_

## Evidencias

- \`pnpm test:e2e\`: _duración y resultado_
- Anotaciones Playwright (\`timeToFirstPuzzleMs\`): _opcional_

## Checklist agente

- [ ] \`pnpm test:e2e\` verde
- [ ] Notas completadas con evidencia
- [ ] Mejoras priorizadas
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, md);
console.log(`Report scaffold: ${outPath}`);