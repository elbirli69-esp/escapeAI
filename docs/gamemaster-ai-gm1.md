# GameMasterAI — GM-1: implementación

Ver diseño en [gamemaster-ai-gm0.md](./gamemaster-ai-gm0.md).

## Componentes

| Módulo | Rol |
|--------|-----|
| `apps/api/src/gamemaster/service.ts` | Orquestación, límites LLM, persistencia |
| `context.ts` | `GmViewContext` por lista blanca de campos |
| `triggers.ts` | Política estático / LLM / silencio |
| `persistence.ts` | `gmInterventions` en KV (lista Redis) o memoria |
| `validation.ts` | Longitud y defensa en profundidad |
| `provider.ts` | DeepSeek/OpenAI vía AI SDK, timeout 4s |

## Contratos (`packages/shared/gamemaster.ts`)

- `NarrativeIntervention`
- `GmViewContext`
- `GmProcessTrigger`

`ApplyResult` incluye `interventions` (nuevas) y `gmInterventions` (historial).

## Separación de historiales

- `session.narrative[]` — solo motor (sin cambios semánticos).
- Intervenciones GM — clave Redis `escapeai:gm:list:{sessionId}`.

## API

- `GET /sessions/:id` → `{ state, gmInterventions, interventions? }`
- `GET /sessions/:id/gm-interventions`
- Acciones: persisten engine primero, luego GM (presupuesto `GM_RESPONSE_BUDGET_MS` ~3.5s).

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `GM_LLM_TIMEOUT_MS` | 4000 | Abort LLM |
| `GM_RESPONSE_BUDGET_MS` | 3500 | Tiempo máximo en respuesta HTTP |
| `GM_MAX_LLM_CALLS` | 40 | Por sesión |
| `GM_LLM_COOLDOWN_MS` | 3000 | Entre llamadas |
| `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` | — | Proveedor |

## Limitaciones conocidas

1. **Serverless:** si el presupuesto HTTP expira, el GM puede terminar en background sin garantía en Vercel; la PWA recupera en el siguiente `GET`.
2. **Redis RMW** en meta de deduplicación: ventana pequeña bajo alta concurrencia (≤5 equipos/evento).
3. **TIME_WARNING:** dedupe en servidor en `GET`/`POST`; umbrales 5 min / 25% / 10%.
4. **TEAM_STUCK / personajes:** GM-2+.

## Tests

```bash
pnpm --filter @escapeai/api test
pnpm -r test
```
