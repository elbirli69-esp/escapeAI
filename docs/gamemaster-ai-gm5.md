# GameMasterAI — GM-5: Dirección adaptativa

**Depende de:** GM-2 (meta de progreso y stuck).

## Alcance

1. **`computeGmPacing`** — compara avance de puzzles vs tiempo (`ahead` | `steady` | `behind` | `critical`).
2. **`resolveAdaptivePolicy`** — en ritmo `behind`/`critical`, baja triggers de baja prioridad de `llm_optional` a `static` (ahorro y foco).
3. **`PACE_NUDGE`** — banner único por partida si el equipo va rezagado (complementa `TEAM_STUCK`).
4. **`GmViewContext`** — `pacingMode`, `progressRatio`, `tempoDirective` para el prompt LLM.

## Variables

| Env | Default | Uso |
|-----|---------|-----|
| `GM_PACE_NUDGE_MIN_ELAPSED` | 0.3 | Fracción de tiempo mínima antes del nudge |

## Meta

- `paceNudgeIssued` en `GmSessionMeta`.

## Fuera de alcance

- Políticas por tipo de evento personalizado en YAML.
- Cron / jobs fuera del poll `processOnRead`.
