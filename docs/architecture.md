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

## Roadmap técnico

- Postgres + Redis para sesiones y timer persistente
- Orquestador IA (Vercel AI SDK) en `apps/api` o `services/orchestrator`
- Multijugador (WebSockets)
- Capacitor para Android / iOS (mismo build de `apps/web`)

## Sala piloto

`packages/escape-content/rooms/pilot.yaml` — tres escenas, cinco interacciones hasta victoria. Cubierta por test en `escape-engine`.
