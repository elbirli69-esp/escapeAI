# GameMasterAI — GM-8: NPC en eventos generados (Fase C)

**Depende de:** GM-3, [gm-dialogo-er-plan.md](./gm-dialogo-er-plan.md).

## Alcance

- `event_guide` en todas las aventuras generadas (`generate-adventure.ts`), presente en `start`.
- `authorizedKnowledge` basado en facts del evento; `forbiddenTopics` sin códigos completos.
- Catálogo: `dock_keeper` opcional en `lighthouse` muelle.
- E2E partidas reales: mystery habla con NPC tras acto 1.

## Tests

- `packages/escape-content/src/generate-adventure.test.ts`
- `apps/api/src/gamemaster/characters.test.ts`
- `e2e/specs/partidas-reales-runner.spec.ts` (mystery)