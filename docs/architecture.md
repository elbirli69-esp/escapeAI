# escapeAI — arquitectura

## Principios

1. **Motor determinista en servidor** — puzzles, inventario, escenas y victoria/derrota viven en `@escapeai/escape-engine`.
2. **Contenido en datos** — salas en YAML (`@escapeai/escape-content`), no hardcodeadas en la UI.
3. **Cliente ligero (PWA)** — Vite + React; muestra `PublicState` y envía acciones tipadas.
4. **GameMasterAI** — `apps/api/src/gamemaster/` observa eventos del motor y emite `NarrativeIntervention` sin modificar el estado. Docs: [GM-1](./gamemaster-ai-gm1.md) … [GM-5](./gamemaster-ai-gm5.md).

## Monorepo

| Paquete / app        | Rol                                      |
| -------------------- | ---------------------------------------- |
| `packages/shared`    | DTOs compartidos (`PublicState`, acciones) |
| `packages/escape-engine` | Sesión, `applyAction`, validación   |
| `packages/escape-content` | Salas YAML + loader                 |
| `apps/api`           | Hono, sesiones/eventos KV, GameMasterAI |
| `apps/web`           | PWA jugador                            |

## Persistencia (MVP)

- Por defecto: sesiones **en memoria** (desarrollo).
- Con `SESSION_DATA_DIR=./data/sessions`: persistencia en **JSON** por sesión (sobrevive reinicios de la API).
- Próximo paso: Postgres (Neon) cuando haya despliegue compartido.

## GameMasterAI (GM-1 / GM-2 / GM-3)

- Intervenciones en `gmInterventions` (KV); el motor sigue escribiendo `session.narrative[]`.
- Triggers: bienvenida, escena, puzzle resuelto, objeto, pasaje, fin de partida; pistas manuales solo en motor.
- Sin API keys: fallback estático. Con LLM: DeepSeek u OpenAI, contexto `GmViewContext` filtrado.

## Roadmap técnico

- Postgres + Redis para sesiones multi-instancia
- Multijugador (WebSockets)
- Capacitor para Android / iOS (mismo build de `apps/web`)

## Sala piloto

Salas en `packages/escape-content/rooms/`:

| ID | Archivo | Test e2e |
| --- | --- | --- |
| `pilot` | `pilot.yaml` | `rooms.test.ts` |
| `lighthouse` | `lighthouse.yaml` | `rooms.test.ts` |

Catálogo expuesto en `GET /rooms` y selector en la PWA.
