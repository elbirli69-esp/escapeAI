# escapeAI — arquitectura

## Principios

1. **Motor determinista en servidor** — puzzles, inventario, escenas y victoria/derrota viven en `@escapeai/escape-engine`.
2. **Contenido en datos** — salas en YAML (`@escapeai/escape-content`), no hardcodeadas en la UI.
3. **Cliente ligero (PWA)** — Vite + React; muestra `PublicState` y envía acciones tipadas.
4. **IA después** — el endpoint `GET /sessions/:id/ai-context` expone contexto sin soluciones; el orquestador consumirá eventos (`hint_requested`, `puzzle_failed`, etc.).

## Monorepo

| Paquete / app        | Rol                                      |
| -------------------- | ---------------------------------------- |
| `packages/shared`    | DTOs compartidos (`PublicState`, acciones) |
| `packages/escape-engine` | Sesión, `applyAction`, validación   |
| `packages/escape-content` | Salas YAML + loader                 |
| `apps/api`           | Hono, sesiones en memoria (MVP)        |
| `apps/web`           | PWA jugador                            |

## Persistencia (MVP)

- Por defecto: sesiones **en memoria** (desarrollo).
- Con `SESSION_DATA_DIR=./data/sessions`: persistencia en **JSON** por sesión (sobrevive reinicios de la API).
- Próximo paso: Postgres (Neon) cuando haya despliegue compartido.

## Orquestador IA

- `apps/api/src/orchestrator.ts`: narración tras eventos (`puzzle_failed`, `hint_requested`, etc.).
- Sin `DEEPSEEK_API_KEY` ni `OPENAI_API_KEY`: modo **fallback** (textos curados + eco de pistas YAML).
- Con **DeepSeek** (`DEEPSEEK_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`) u OpenAI directo: narración breve sin revelar soluciones.

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
