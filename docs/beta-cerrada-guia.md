# Guía rápida — beta cerrada (organizador)

## Modelo de producto

- **2–5 equipos** por evento; **un móvil por equipo**.
- Mismo **código de 6 caracteres**; cada equipo tiene **su propia partida** (no co-op en una sesión).
- Al unirse con nombre de equipo, la partida **arranca al momento** (no hay «inicio» del anfitrión).
- **Catálogo:** partida solitaria en ese móvil (práctica o demo).

## Flujo recomendado

1. **Crear experiencia** → elegir plantilla, equipos, datos → anotar código y QR.
2. **Panel organizador** en TV/proyector (`?projector=1` si aplica) → ranking cada ~8 s.
3. Cada equipo: **Unirse** → código + nombre → jugar en su móvil.
4. Resolver puzzles en paralelo; opcional **candado comunitario** en modos `team` / `celebration`.

## Fair play

- Pistas oficiales: botón **Pedir pista** en cada reto (niveles N1→N3).
- **Ayuda del director** (chips): orientación sin códigos.
- Conserje/NPC: no dan la solución numérica del candado.

## Qué comunicar a jugadores

- No es un solo móvil compartido entre todos.
- Si un equipo abandona, los demás siguen; pueden **volver** con el mismo nombre de equipo si la sesión no expiró (TTL ~48 h en servidor).

## Comandos QA previos

```bash
pnpm exec playwright test e2e/specs/smoke.spec.ts e2e/specs/events-mvp.spec.ts e2e/specs/organizer-panel.spec.ts
```