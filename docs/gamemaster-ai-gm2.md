# GameMasterAI — GM-2: Pistas graduadas y TEAM_STUCK

**Depende de:** GM-1 (`main` tras PR #40).

## Alcance

1. **`HINT_GRANTED`** — cuando el motor emite `hint_requested`, el Director añade una línea en `gmInterventions[]` (YAML autorizado o parafraseo LLM opcional), sin auto-consumir pistas.
2. **`TEAM_STUCK`** — heurística sin LLM; banner opcional que invita a usar «Pedir pista» (no entrega hint automático).
3. **Meta de sesión GM** — `focusedPuzzleId`, `lastProgressMs`, `stuckNotifiedPuzzleIds`.
4. **PWA** — intervenciones con `presentation: "banner"` (avisos de tiempo y bloqueo).

## Módulos

| Archivo | Rol |
|---------|-----|
| `hints.ts` | Texto YAML autorizado, nivel de spoiler, puzzle activo |
| `stuck-detection.ts` | `updateProgressMeta`, `detectTeamStuckTrigger`, umbrales env |
| `triggers.ts` | `HINT_GRANTED` / `TEAM_STUCK` en `TRIGGER_POLICY` |
| `service.ts` | Orquesta meta, stuck en `processAfterAction` / `processOnRead` |
| `context.ts` | `buildGmViewContextForHint` + `authorizedHintLine` en shared |

## Variables de entorno

| Variable | Default | Uso |
|----------|---------|-----|
| `GM_STUCK_MIN_ATTEMPTS` | 3 | Intentos mínimos + idle |
| `GM_STUCK_IDLE_MS` | 240000 | Sin progreso (ms) |
| `GM_STUCK_FAST_ATTEMPTS` | 5 | Bloqueo solo por intentos |

## Contratos

- `GmTriggerType`: `TEAM_STUCK`, `HINT_GRANTED`.
- `NarrativeIntervention`: `clueRefs`, `presentation: "banner"` para stuck/time.
- `GmViewContext.authorizedHintLine` solo en flujo de pista.

## Fuera de alcance (GM-3+)

- Personajes conversacionales.
- Auto-hint sin acción del jugador.
- Contexto spatial enriquecido para el LLM.
