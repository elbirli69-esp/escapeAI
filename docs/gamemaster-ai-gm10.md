# GameMasterAI — GM-10: Endurecimiento (Fase F)

**Depende de** fases GM-6…GM-9.

## Entregables

1. Matriz A–L documentada con enlaces a tests → [gm-dialogo-er-matrix.md](./gm-dialogo-er-matrix.md).
2. E2E `gm-dialogo-matrix.spec.ts` (casos C, D, K en pilot).
3. Unit `hint-levels.test.ts` (caso J).
4. Entrada en `e2e/experience-matrix.json` perfil `gm-dialogo-matrix`.

## Fuera de alcance Fase F

- Caso E totalmente automático (requiere juicio semántico LLM).
- Matriz A–L 100 % e2e (partidas reales siguen siendo muestra parcial).

## Comando rápido

```bash
pnpm --filter @escapeai/escape-engine test -- hint-levels
pnpm --filter @escapeai/api test -- orchestration
pnpm exec playwright test e2e/specs/gm-dialogo-matrix.spec.ts e2e/specs/director-faq.spec.ts
```