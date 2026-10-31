# Testing Strategy — escapeAI

## Pirámide

```mermaid
flowchart TB
  E2E[Playtest manual 6 jugadores]
  MP[Multiplayer harness]
  INT[Integration API + DB]
  UNIT[Unit game-engine]
  E2E --> MP --> INT --> UNIT
```

## Unit tests (`packages/game-engine`)

| Área | Casos |
|------|-------|
| State machine | Transiciones válidas/inválidas; terminales |
| Puzzle validation | Cada `ValidationStrategy`; normalización |
| Dependencies | Locked hasta unlock |
| Permissions | Rol/slot/visibilidad |
| Clue distribution | Grants al start; share |
| Timer | Pause/resume elapsed |
| Replay | Mismo estado que apply incremental |
| Projections | No leaks validation/solution |

Framework: **Vitest**. Fixture: `fixtures/six-suspects/`.

## Integration tests (`apps/web` o `packages/server-tests`)

| Flujo | Verificación |
|-------|--------------|
| Create session | invite_code único |
| Join ×6 | tokens distintos |
| Assign roles | unicidad |
| Start | status running + clues |
| Submit correct/wrong | events + attempts |
| Share clue | otro view |
| Idempotency | duplicate key |
| Host pause | timer flag |

DB: Supabase local o Testcontainers Postgres.

## Multiplayer tests

Harness `SimClient` con fetch + optional Realtime mock:

- Respuestas simultáneas mismo puzzle
- Eventos duplicados (retry red)
- Desconexión mid-game → reconnect + view
- Permisos: jugador A no ve clue B

Simular reinicio: reload state from snapshot + replay.

## AI tests (Fase 4–5)

| Tipo | Método |
|------|--------|
| Structural Creator output | Zod + graph rules |
| GM leakage | Prompts adversariales; assert no tool prohibido |
| NPC consistency | Snapshot responses con mock LLM |
| Cost | budget exceeded → 429 |

Mock LLM: respuestas grabadas en CI; live opcional nightly.

## CI

- PR: unit + integration (sin LLM live)
- Main: + harness 6 players
- Optional: nightly playtest checklist manual

## Cobertura

Objetivo pragmático: **motor ≥90%** branches críticos; UI smoke mínimo hasta Fase 3.

## Experiencia de referencia

Toda suite referencia **El caso de los seis sospechosos** como golden definition; cambios en JSON requieren revisión explícita de tests.
