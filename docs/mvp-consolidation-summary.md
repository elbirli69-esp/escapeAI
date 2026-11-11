# MVP consolidación — resumen (ramas `cursor/mvp-consolidation-77f8`)

## Fase A — Diagnóstico

Ver `mvp-audit-phase-a.md`. Producción en `main` aún **sin** eventos ni interactivos (#13/#14 abiertos).

## Fase B–C — Hecho en esta rama

| Cambio | Detalle |
|--------|---------|
| Modelo **equipos** | `teamCount` 2–5, `/events/:code/teams`, sesión por `teamId` |
| Leaderboard | Progreso (`puzzlesSolved`), tiempo, ranking por estado |
| Wizard | Equipos, duración 30/45/60 min |
| Panel organizador | `EventOrganizerBoard`, polling 8s |
| Generador | `timeLimitSec` desde `durationMin` |
| Tests | `apps/api/src/event-flow.test.ts` (escenario Sara) |
| Legacy | `/players` y `playerId` siguen funcionando |

## Fase D — Pendiente menor

- Recuperar sesión de equipo vía `teamId` en localStorage al recargar (hoy: `sessionId`).
- Copy narrativo aún mejorable vs “plantilla con nombre”.
- README raíz desactualizado.

## Fase E — Validación

```bash
pnpm build && pnpm test && pnpm validate-rooms
```

Manual: crear evento “Sara”, 5 equipos, 60 min → códigos → unir 2 equipos → panel organizador.

## Merge recomendado

Un solo PR a `main` desde **`cursor/mvp-consolidation-77f8`** (supersedes #13/#14).

## Riesgos

- Colisión guardado evento Redis (bajo con ≤5 equipos).
- Permisos cámara/voz en Safari.
