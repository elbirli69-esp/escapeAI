# Implementation Plan — escapeAI

Tareas pequeñas asignables a agentes. Orden recomendado dentro de cada fase.

Convención: `[P]` paralelizable; `[S]` secuencial.

---

## Fase 0 — Foundation

| ID | Tarea | Agente sugerido | Deps |
|----|-------|-----------------|------|
| 0.1 | Inicializar monorepo pnpm + TS strict | infra | — |
| 0.2 | Crear `packages/shared` con Zod schemas base (export GAME_ENGINE_SPEC subset) | engine | 0.1 |
| 0.3 | Crear `packages/game-engine` skeleton + vitest | engine | 0.2 |
| 0.4 | Supabase project + `supabase/migrations/0001_core.sql` | infra | 0.1 |
| 0.5 | Esqueleto `apps/web` Next.js App Router PWA manifest | web | 0.1 |
| 0.6 | Fixture mínimo `six-suspects` validable | content/engine | 0.2 |
| 0.7 | CI GitHub Actions: typecheck + test | infra | 0.3 |
| 0.8 | README: enlaces docs + comandos dev | docs | 0.1 |

**Paralelo:** 0.2/0.4/0.5 tras 0.1.

---

## Fase 1 — Game Engine

| ID | Tarea | Deps |
|----|-------|------|
| 1.1 | Implementar `createInitialState` | 0.3 |
| 1.2 | State machine transiciones + tests | 1.1 |
| 1.3 | Validators: exact, normalized, multiple_choice | 1.1 |
| 1.4 | Validators: ordering, combination | 1.3 |
| 1.5 | Dependencies / unlocks engine | 1.2 |
| 1.6 | Phase progression + conditions | 1.5 |
| 1.7 | Timer pause/resume logic | 1.2 |
| 1.8 | Commands handler map + permission checks | 1.2–1.7 |
| 1.9 | `projectPlayerView` / `projectHostView` | 1.8 |
| 1.10 | `replayEvents` + snapshot helper | 1.8 |
| 1.11 | Register custom rule stub + test | 1.4 |
| 1.12 | Expand fixture six-suspects (puzzles dummy) | 1.8 |

**Gate:** todos los tests 1.x verdes antes de Fase 2.

---

## Fase 2 — Multiplayer

| ID | Tarea | Deps |
|----|-------|------|
| 2.1 | DB repos: sessions, players, events | 0.4, 1.10 |
| 2.2 | `POST sessions` create + invite code | 2.1 |
| 2.3 | Join flow + token issue/hash | 2.2 |
| 2.4 | Command API + FOR UPDATE + idempotency | 2.1, 1.8 |
| 2.5 | View API filtered | 2.4, 1.9 |
| 2.6 | Realtime signal broadcast post-commit | 2.4 |
| 2.7 | Client hook: signal → fetch view | 2.5, 2.6 |
| 2.8 | Player UI: lobby + join | 2.3, 2.7 |
| 2.9 | Player UI: running (puzzles/clues) | 2.8 |
| 2.10 | Host dashboard | 2.5 |
| 2.11 | Integration tests API | 2.4 |
| 2.12 | Multi-client harness (6 players) | 2.11 |
| 2.13 | Presence + reconnect polling fallback | 2.7 |

---

## Fase 3 — Seis sospechosos

| ID | Tarea | Deps |
|----|-------|------|
| 3.1 | Author full `game-definition.json` | 1.12 |
| 3.2 | Assets: PDF generation/upload | 3.1 |
| 3.3 | QR puzzle + landing validation | 3.1 |
| 3.4 | UI components per puzzle type | 2.9 |
| 3.5 | Narrative final branching UI | 3.4 |
| 3.6 | Host prep doc (markdown) | 3.1 |
| 3.7 | Playtest fixes | 3.5 |
| 3.8 | NPC script fallback (sin LLM) | 3.4 |

---

## Fase 4 — AI Creator

| ID | Tarea | Deps |
|----|-------|------|
| 4.1 | `creator_jobs` + queue worker | 3.1 |
| 4.2 | Prompts v1 + brief analyzer | 4.1 |
| 4.3 | Stages narrative → puzzle → multiplayer | 4.2 |
| 4.4 | Structural validator (reuse Zod) | 4.3 |
| 4.5 | Coherence LLM check | 4.4 |
| 4.6 | Creator Studio briefing form | 4.1 |
| 4.7 | Edit/publish UI | 4.6 |
| 4.8 | Asset planner + image jobs | 4.3 |

---

## Fase 5 — AI GM

| ID | Tarea | Deps |
|----|-------|------|
| 5.1 | GM context builder (redaction tests) | 3.1 |
| 5.2 | Tool adapter → commands | 5.1, 1.8 |
| 5.3 | SSE chat endpoint | 5.2 |
| 5.4 | Progressive hint tool | 5.2 |
| 5.5 | Interrogation keywords | 3.8 |
| 5.6 | AI security test suite | 5.3 |
| 5.7 | Budget limits | 5.3 |

---

## Fase 6 — Monetización

| ID | Tarea | Deps |
|----|-------|------|
| 6.1 | Stripe checkout + webhooks | 4.7 |
| 6.2 | Plans + entitlements | 6.1 |
| 6.3 | AI budget enforcement | 6.2, 5.7 |
| 6.4 | Analytics aggregates | 2.1 |

---

## Reglas para agentes

1. Un agente por paquete lógico por PR cuando sea posible (`game-engine` vs `web`).
2. No modificar schemas Zod sin actualizar tests + fixture.
3. Toda mutación de partida pasa por Command API.
4. PR debe incluir tests si toca motor o permisos.
5. Tras merge, ejecutar harness multi-cliente antes de marcar Fase 2 completa.

---

## Definición de “hecho” por PR

- Typecheck limpio
- Tests relevantes añadidos/actualizados
- Sin `console.log` debug
- ADR nuevo si cambia decisión arquitectónica
