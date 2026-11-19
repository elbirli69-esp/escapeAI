# GameMasterAI — GM-10: Endurecimiento (Fase F)

**Depende de** fases GM-6…GM-9.

## Entregables

1. Matriz A–L documentada con enlaces a tests → [gm-dialogo-er-matrix.md](./gm-dialogo-er-matrix.md).
2. E2E `gm-dialogo-matrix.spec.ts` (casos C, D, K en pilot).
3. Unit `hint-levels.test.ts` (caso J).
4. Entrada en `e2e/experience-matrix.json` perfil `gm-dialogo-matrix`.

## Estado (post–GM-10)

Matriz A–L en **PASS** — [gm-dialogo-er-matrix.md](./gm-dialogo-er-matrix.md); plan §10.3 alineado en [gm-dialogo-er-plan.md](./gm-dialogo-er-plan.md).

## Fuera de alcance Fase F

- Caso E con **LLM activo**: CI cubre respuesta **estática** (`meta.provider: static`); juicio semántico del modelo queda para playtest manual con `OPENAI_*` / `DEEPSEEK_API_KEY`.
- Matriz A–L 100 % vía solo `partidas-reales-runner` (sigue siendo muestra exploratoria; los specs dedicados son la regresión).

## Comando rápido

```bash
pnpm --filter @escapeai/escape-engine test -- hint-levels
pnpm --filter @escapeai/api test -- orchestration
pnpm exec playwright test \
  e2e/specs/gm-dialogo-case-a.spec.ts \
  e2e/specs/gm-dialogo-case-e.spec.ts \
  e2e/specs/gm-dialogo-matrix.spec.ts \
  e2e/specs/director-faq.spec.ts \
  e2e/specs/gamemaster-reload.spec.ts
```