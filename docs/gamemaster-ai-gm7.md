# GameMasterAI — GM-7: Clue ledger (Fase B)

**Depende de:** [gm-dialogo-er-plan.md](./gm-dialogo-er-plan.md), GM-6.

## Entregables

| Pieza | Descripción |
| ----- | ----------- |
| `ClueLedgerEntry` | `@escapeai/shared` — `hint` \| `beat_clue` |
| `PublicState.clueHistory` | Derivado en `buildClueHistory` (`escape-engine`) |
| Linter N3 | `validate-rooms` detecta literal de `answer` en pista nivel 3 |
| YAML catálogo | N3 sin spoiler en `pilot` / `lighthouse` |

## Invariantes

- No segundo almacén: mismo dato que `puzzleHintsUsed` + `grantedClues`.
- `clueNotes` se mantiene por compatibilidad PWA; `clueHistory` es la vista completa.

## Tests

- `packages/escape-engine/src/clue-ledger.test.ts`
- `packages/escape-engine/src/clues-beats.test.ts`
- `pnpm --filter @escapeai/escape-content exec tsx src/validate-rooms.ts`