# Casos E y L — hipótesis NPC y pistas tras reload

## Caso E

Jugador afirma código/objeto falso al conserje. Sin LLM (`OPENAI_*` vacío), el motor solo sirve `fallbackLines` del YAML; la respuesta **no repite** la hipótesis ni confirma códigos inventados.

- API: `apps/api/src/gamemaster/characters.test.ts` («Caso E»)
- E2E: `e2e/specs/gm-dialogo-case-e.spec.ts`

```bash
pnpm --filter @escapeai/api test -- characters
pnpm exec playwright test e2e/specs/gm-dialogo-case-e.spec.ts
```

Con LLM activo, el prompt de personaje ya limita conocimiento autorizado; la suite E cubre el camino **estático** exigible en CI.

## Caso L

`puzzleHintsUsed` debe sobrevivir `serializeSession` y, tras `F5`, la siguiente `request_hint` entrega el **siguiente** nivel (no repetir N1).

- Engine: `packages/escape-engine/src/session-serialize.test.ts`
- E2E: `e2e/specs/gamemaster-reload.spec.ts` («Caso L»)

```bash
pnpm --filter @escapeai/escape-engine test -- session-serialize
pnpm exec playwright test e2e/specs/gamemaster-reload.spec.ts --grep "Caso L"
```