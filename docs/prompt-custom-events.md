# Prompt: experiencias personalizadas (eventos multijugador)

Brief ejecutado para cumpleaños y eventos futuros (hasta 20 jugadores).

## Objetivo

Flujo **genérico** antes de jugar:

1. **Organizador** elige tipo de aventura, número de jugadores (1–20), datos del protagonista y hechos jugables.
2. El servidor **genera** una sala determinista (misma plantilla + mismos datos = misma partida).
3. Cada jugador **se une** con código + nombre; obtiene **su propia sesión** (progreso individual, mismos puzzles).
4. El narrador (DeepSeek) recibe **nombre del jugador** para pistas y frases personalizadas.
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
| POST | `/api/events/:code/players` | Alta jugador (slot ≤ `playerCount`) |
| POST | `/api/sessions` | `{ eventCode, playerId }` o `{ roomId }` legado |
| GET | `/api/events/:code/leaderboard` | Quién ha terminado y tiempo |

## Límites

- Máximo **20** jugadores por evento (configurable en creación).
- **No** hay estado compartido en tiempo real (cada móvil = una sesión); ideal para carrera por equipos o individuales en la misma fiesta.
- La sala generada vive en Redis con el mismo TTL que las sesiones.

## Próximo (no v1)

- Edición LLM de textos (solo flavor, validación YAML).
- Modo “pantalla única” para proyectador.
- Variables compartidas entre equipo (sub-eventos).
