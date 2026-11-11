# Fase A — Auditoría MVP (2026-03-24)

## Estado real en `main` (producción)

| Área | Estado |
|------|--------|
| PWA + API Hono + Vercel | Operativo |
| Salas YAML `pilot`, `lighthouse` | OK |
| Motor, Redis/KV, narrador DeepSeek | OK |
| Eventos personalizados | **No en main** |
| Pruebas interactivas | **No en main** |
| Equipos (2–5) | **No existe** (diseño 20 jugadores individuales) |
| Leaderboard UI | **Solo API**, sin pantalla organizador |
| Tests API eventos | **Ninguno** |

## PR abiertos

- **#13** `cursor/custom-events-77f8` — MERGEABLE, CI verde.
- **#14** `cursor/interactive-challenges-77f8` — incluye #13 + interactivo + producto genérico; CI verde.

Base de implementación MVP: rama **#14**.

## Huecos vs criterios de aceptación

| Criterio MVP | Gap |
|--------------|-----|
| Equipos compitiendo | Modelo actual = 1 sesión por **persona**, no por **equipo** |
| 2–5 equipos habitual | `playerCount` hasta 20 |
| Organizador sigue ranking | Sin vista proyector/organizer |
| Duración 30–60 min configurable | Fija 2700s en generador |
| Personalización profunda | Hechos en textos/códigos; mejorable en narrativa |
| Recarga conserva sesión | OK vía `localStorage.sessionId` |
| Sin IA en validación | OK motor determinista |

## Riesgos

1. **Evento en Redis**: read-modify-write del JSON completo; colisión rara con ≤5 equipos.
2. **Cámara/voz**: permisos y Safari; requieren fallback (introducir código manual documentado).
3. **Dos PRs**: consolidar en un merge a `main` (#14 suficiente).
4. **Producción sin merge**: wizard/eventos no visibles en escapeai-self hasta deploy post-merge.

## Duplicidades

- #13 ⊆ #14: cerrar #13 tras merge de #14 o mergear solo #14.

## Cambios imprescindibles (Fase B–C)

1. `teamCount` (2–5), join por **nombre de equipo**, sesión por equipo.
2. Leaderboard con tiempo / estado / pistas (sync desde sesión).
3. Wizard: equipos + duración; copy organizador.
4. Pantalla ranking (organizador / proyector simple).
5. Tests integración API flujo evento.
6. `timeLimitSec` desde duración del wizard.

## Posponer

- WebSockets, visión en fotos, TTS, pistas distintas por slot, marketplace, app nativa.
