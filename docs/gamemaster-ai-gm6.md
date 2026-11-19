# GameMasterAI — GM-6: Ayuda del director (FAQ)

**Depende de:** GM-5, plan [gm-dialogo-er-plan.md](./gm-dialogo-er-plan.md).

## Alcance (Fase A + E)

1. **Contratos** — `DirectorFaqId`, acción `director_faq`, trigger `DIRECTOR_FAQ`, evento `director_faq`.
2. **Motor** — valida partida activa; no altera puzzles.
3. **GM** — copy estático en `director-faq.ts`; límites `GM_DIRECTOR_FAQ_MAX`, `GM_DIRECTOR_FAQ_COOLDOWN_MS`.
4. **PWA** — panel chips `escape-director-faq` (sin chat libre).
5. **Orquestación** — `sortTriggersByPriority` (inicio Fase D).

## Fuera de alcance GM-6

- LLM para FAQ (siempre `static` en `TRIGGER_POLICY`).
- Clue ledger export (Fase B).
- NPC en eventos generados (Fase C).

## Variables

| Env | Default |
| --- | ------- |
| `GM_DIRECTOR_FAQ_MAX` | 12 |
| `GM_DIRECTOR_FAQ_COOLDOWN_MS` | 60000 |

## Tests

- `packages/escape-engine/src/director-faq.test.ts`
- `apps/api/src/gamemaster/director-faq.test.ts`
- `e2e/specs/director-faq.spec.ts`