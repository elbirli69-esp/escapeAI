# Matriz de validación GM diálogo ER (A–L)

Referencia: [gm-dialogo-er-plan.md](./gm-dialogo-er-plan.md) §10.3. Estado tras **Fase F** (automatización conocida).

| Caso | Automatización | Estado |
| ---- | -------------- | ------ |
| A | `partidas-reales-runner` (pilot novatos) | PARCIAL |
| B | `clue-ledger.test.ts`, `hint-levels.test.ts` | PASS |
| C | `e2e/specs/gm-dialogo-matrix.spec.ts` | PASS |
| D | `e2e/specs/gm-dialogo-matrix.spec.ts` | PASS |
| E | manual LLM off / copy estable | MANUAL |
| F | `experience-metrics.spec.ts` | PASS |
| G | `orchestration.test.ts` | PASS |
| H | `orchestration.test.ts`, `service.test.ts` | PASS |
| I | `orchestration.test.ts` | PASS |
| J | `hint-levels.test.ts` | PASS |
| K | `e2e/specs/gm-dialogo-matrix.spec.ts` | PASS |
| L | `gamemaster-reload.spec.ts` | PARCIAL (GM; hints en reload opcional) |

## E2E dedicados

- `director-faq.spec.ts` — FAQ director (Fase E)
- `gm-dialogo-matrix.spec.ts` — NPC límites (C, D, K)
- `partidas-reales-runner.spec.ts` — GM + director en partidas sintéticas

## Métricas playtest (§10.4)

Export en `partidas-reales-runner` → `e2e/.cache/partidas-reales-runs.json` (`gmLineCount`, `hintDependency`, veredictos `gamemaster`).

`PublicState.clueHistory` disponible para telemetría cliente (GM-7).