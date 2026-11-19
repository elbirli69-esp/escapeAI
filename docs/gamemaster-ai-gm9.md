# GameMasterAI — GM-9: Orquestación (Fase D)

**Depende de:** GM-6 (`sortTriggersByPriority`), [gm-dialogo-er-plan.md](./gm-dialogo-er-plan.md) §6.2.

## Entregables

| Pieza | Función |
| ----- | ------- |
| `filterOrchestrationTriggers` | Coalesce banners; suprime `TEAM_STUCK` si puzzle resuelto o partida terminada |
| `service.processTriggers` | Orden: filter → sort → render |
| Tests | Casos G–I en `orchestration.test.ts` |

## Reglas

1. `PUZZLE_SOLVED` (mismo `puzzleId`) → sin `TEAM_STUCK` de ese puzzle.
2. `GAME_WON` / `GAME_LOST` o `status !== playing` → sin stuck, pace ni FAQ.
3. Varios banners (`TIME_WARNING`, `TEAM_STUCK`, `PACE_NUDGE`) → uno solo, el de mayor prioridad.

## Tests

- `apps/api/src/gamemaster/orchestration.test.ts`
- `apps/api/src/gamemaster/trigger-priority.test.ts`