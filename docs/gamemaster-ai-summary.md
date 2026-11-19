# GameMasterAI — Resumen (GM-0 → GM-5)

**Estado:** implementado en `main` (fases GM-1…GM-5 vía PRs #40–#44).  
**Código:** `apps/api/src/gamemaster/`, contratos en `packages/shared/src/gamemaster.ts`.

## Principio

El **Escape Engine** es la fuente de verdad del juego. GameMasterAI **observa** acciones y eventos, emite `NarrativeIntervention` en KV/lista (`gmInterventions[]`) y **no** modifica inventario, puzzles ni victoria.

| Stream | Dónde vive |
|--------|------------|
| Log del motor | `session.narrative[]` |
| Director / personajes | `gmInterventions[]` |

## Fases entregadas

| Fase | PR ref. | Entrega clave |
|------|---------|----------------|
| **GM-0** | #39 / doc | Arquitectura y auditoría → [gm0](./gamemaster-ai-gm0.md) |
| **GM-1** | #40 | `GameMasterService`, triggers, KV, diario PWA → [gm1](./gamemaster-ai-gm1.md) |
| **GM-2** | #41 | `TEAM_STUCK`, `HINT_GRANTED`, banners → [gm2](./gamemaster-ai-gm2.md) |
| **GM-3** | #42 | Personajes YAML, `talk_to_character`, `CHARACTER_TURN` → [gm3](./gamemaster-ai-gm3.md) |
| **GM-4** | #43 | `presentation: tts`, Web Speech en cliente → [gm4](./gamemaster-ai-gm4.md) |
| **GM-5** | #44 | Ritmo adaptativo, `PACE_NUDGE`, política LLM → [gm5](./gamemaster-ai-gm5.md) |
| **GM-6** | — | FAQ director (chips), `director_faq`, prioridad triggers → [gm6](./gamemaster-ai-gm6.md) |
| **GM-7** | — | Clue ledger `clueHistory`, linter N3 → [gm7](./gamemaster-ai-gm7.md) |
| **GM-8** | — | NPC `event_guide` en eventos + lighthouse → [gm8](./gamemaster-ai-gm8.md) |
| **GM-9** | — | Orquestación filter + prioridad (Fase D) → [gm9](./gamemaster-ai-gm9.md) |
| **GM-10** | — | Matriz A–L + E2E NPC/FAQ → [gm10](./gamemaster-ai-gm10.md) · [matriz](./gm-dialogo-er-matrix.md) |

## Triggers principales

`SESSION_STARTED`, `SCENE_ENTERED`, `PUZZLE_SOLVED`, `ITEM_TAKEN`, `PASSAGE_UNLOCKED`, `TIME_WARNING`, `TEAM_STUCK`, `HINT_GRANTED`, `CHARACTER_TURN`, `PACE_NUDGE`, `GAME_WON` / `GAME_LOST`.

Política por defecto en `TRIGGER_POLICY` (`apps/api/src/gamemaster/triggers.ts`); GM-5 puede forzar **estático** en ritmo `behind` / `critical`.

## Variables de entorno (GM)

| Variable | Uso |
|----------|-----|
| `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` | LLM opcional |
| `GM_MAX_LLM_CALLS`, `GM_LLM_COOLDOWN_MS` | Límites LLM |
| `GM_STUCK_*` | Heurística bloqueo |
| `GM_MAX_CHARACTER_LLM`, `GM_CHARACTER_COOLDOWN_MS` | Personajes |
| `GM_PACE_NUDGE_MIN_ELAPSED` | Aviso de ritmo |
| `GM_RESPONSE_BUDGET_MS` | Presupuesto en `POST .../actions` |

## API y UI

- `GET /api/sessions/:id` → `{ state, gmInterventions }`
- PWA: diario mezclado motor + GM; badges Director/Personaje; banners (`TEAM_STUCK`, tiempo, `PACE_NUDGE`); chat personaje; toggle voz GM-4.

## Observabilidad

`GET /api/health` incluye:

```json
"gameMaster": {
  "enabled": true,
  "llmConfigured": true,
  "runtime": {
    "scope": "process",
    "interventionsTotal": 12,
    "llmAttempts": 3,
    "llmSuccesses": 2,
    "llmFallbacks": 1,
    "staticInterventions": 9,
    "fallbackRate": 0.333,
    "byTrigger": { "SESSION_STARTED": 1 }
  }
}
```

Los contadores son **por instancia de proceso** (serverless: no agregan entre réplicas). Logs estructurados por intervención: `gm_provider`, `gm_fallback`, `gm_trigger`.

## Contenido de ejemplo

- **Pilot:** conserje `night_concierge` (escena `entrance`), pistas YAML, voz opcional.

## Producto — plan de diálogo ER

| Documento | Contenido |
| --------- | --------- |
| [gm-dialogo-er-plan.md](./gm-dialogo-er-plan.md) | Plan maestro |
| [gm-dialogo-er-matrix.md](./gm-dialogo-er-matrix.md) | Estado casos A–L |
| [gamemaster-ai-caso-a.md](./gamemaster-ai-caso-a.md) | Caso A (atasco sin pista) |

Plan maestro (GM-6+): [gm-dialogo-er-plan.md](./gm-dialogo-er-plan.md).

## Pendiente / fuera del roadmap GM-0
- TTS cloud del Director.
- Contexto spatial enriquecido para el LLM (previsto en GM-0 §7.4).
- Orquestador legado: shim; deprecar cuando la UI solo use `gmInterventions`.
