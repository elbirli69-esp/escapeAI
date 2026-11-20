# Prompt: experiencias personalizadas (eventos multijugador)

Brief para **cualquier ocasión** (fiesta, homenaje, misterio, reto de equipo; **2–5 equipos**, un móvil por equipo). Ver [product-generic-experiences.md](./product-generic-experiences.md).

## Objetivo

Flujo **genérico** antes de jugar:

1. **Organizador** elige tipo de aventura, **número de equipos (2–5)**, datos del protagonista y hechos jugables.
2. El servidor **genera** una sala determinista (misma plantilla + mismos datos = misma partida).
3. Cada **equipo** se une con código + nombre de equipo; obtiene **su propia sesión** (mismos puzzles, progreso aislado).
4. El GameMaster recibe **nombre del equipo** en copy de bienvenida y ranking.
5. Salas clásicas (`pilot`, `lighthouse`) siguen disponibles en modo “Catálogo”.

## Tipos de aventura (v1)

| `adventureType` | Uso |
| ----------------- | --- |
| `birthday` | Protagonista + año/código + objeto simbólico |
| `celebration` | Fiesta / grupo (menos intimista) |
| `mystery` | Tono enigma / investigación |
| `team` | Reto de equipo genérico |

## API

| Método | Ruta | Rol |
| ------ | ---- | --- |
| GET | `/api/adventures` | Plantillas y campos sugeridos |
| POST | `/api/events` | Crear evento → `joinCode`, vista previa |
| GET | `/api/events/:code` | Estado del evento (sin soluciones) |
| POST | `/api/events/:code/teams` | Alta equipo (cupo ≤ 5) |
| POST | `/api/events/:code/players` | Alias de `/teams` |
| POST | `/api/sessions` | `{ eventCode, teamId }` o `{ roomId }` catálogo |
| GET | `/api/events/:code/leaderboard` | Quién ha terminado y tiempo |

## Límites

- Máximo **5 equipos** por evento (`teamCount` en creación).
- **No** hay co-op en una misma sesión (varios móviles compartiendo progreso); ideal para **carrera por equipos** en la misma fiesta.
- El campo legacy `playerCount` / `MAX_EVENT_PLAYERS` en tipos no define el cupo real (usar `teamCount`).
- La sala generada vive en Redis con el mismo TTL que las sesiones.

## Próximo (no v1)

- Edición LLM de textos (solo flavor, validación YAML).
- Modo “pantalla única” para proyectador.
- Variables compartidas entre equipo (sub-eventos).
