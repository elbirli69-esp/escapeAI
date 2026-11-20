# Informe playtest en grupo — 2026-11-18

Ejecución según [prompt-playtest-grupo.md](./prompt-playtest-grupo.md). **No commiteado** (criterio DoD del prompt).

> **Actualización 2026-11-20 (infra playtest, sí en repo):** `e2e/playtest-matrix.json`, `pnpm playtest:replay <suite>`, catálogo `office` en `experience-matrix.json`, métricas e2e y corrida `partidas-reales` experto oficina. Backlog mailroom P0: cubierto con `mailroom-entry-regression.spec.ts`.
> **B.1:** `pnpm playtest:facts-diff` + `custom-events-serial.spec.ts` (`mystery` / `team` / `celebration` vía API).
> **B.2:** `playtest-blind-pilot-entry.spec.ts`, taglines `ROOM_CATALOG` ↔ YAML, mezcla cualitativa en `experience-matrix.json` (`playtestQualitativeBlend`).
> **B.3:** `playtest-blind-office-entry.spec.ts`, `e2e/playtest-coverage.json`, `pnpm playtest:snapshot` → `e2e/.cache/playtest-snapshot.json` (renovación §4 P6).
> **Fase D:** `playtest-blind-lighthouse-entry.spec.ts` (`eq-sensorial`, muelle → almacén).

## Resumen ejecutivo

| Concepto | Resultado |
| -------- | --------- |
| `gitSha` / rama | `1c28248` / `main` |
| Corridas registradas | 11 entradas en `e2e/.cache/playtest-grupo-runs.json` |
| Por `executionMode` | estática: 3 · replay: 7 · exploratorio: 1 (computerUse pilot) |
| E2E | **20/20** en `CI=1 pnpm test:e2e` (~1 min) |
| `audit-coherence` | **0 errores**, 7 warnings |
| `experience-eval` global | **9,86/10** |
| LLM | **no_configurado** (`OPENAI_*` / `DEEPSEEK_*` ausentes) |

### Cobertura vs §4 del prompt

| Requisito | Estado |
| --------- | ------ |
| 4 salas catálogo | **OK** (replay E2E) |
| 4 `adventureType` | **Parcial** — auditoría estática en `audit-coherence` (generated:\*); UI/E2E solo `birthday` (Sara) |
| 2 payloads / tipo | **Parcial** — 1 por UI; otros tipos vía tests `generate-adventure.test.ts`, no lobby custom |
| 5 perfiles equipo | **Parcial** — replay asignado por sala; exploratorio ciego solo anotado |
| Victorias exploratorias | **0** — exploratorio pilot: `partialWin` (entrada OK; victoria global no) |
| Scanner espacial | **N/D** — sin spec E2E |

**Conclusión DoD:** ejecución **no cerrada** en sentido estricto del prompt (falta Fase D amplia y 2º payload por tipo en UI). Resultados técnicos y estáticos sí son accionables.

## Referencias verificadas / gaps

- `pnpm validate-rooms` → OK (4 salas).
- `pnpm audit-coherence` → informe `docs/coherencia-partidas-informe.md`.
- `pnpm build` → **fallo** `apps/web` (`vitest` no resuelto en `tsc --noEmit`). E2E arrancó Vite vía Playwright `webServer`.
- `pnpm --filter @escapeai/escape-engine test` → 21 tests OK.
- `generateAdventureRoom` en CLI tsx → error exports `@escapeai/shared`; usado **vitest** `generate-adventure.test.ts`.
- GM baseline: `escape-gm-line`, métricas `gmLinesBeforeFirstSolve` ≥ 2 en catálogo P0.
- Pistas UI: botón «Pedir pista» (no `escape-hint`).

## Hallazgos P0 / producto

1. **Warning `clue-ledger`** en los 4 tipos generados: `token_slot` no enlaza pista del acto 1 (`audit-coherence`).
2. **Pista nivel 3 `lockbox` (pilot)** entrega solución literal «Prueba 1984» — spacer de fair play en grupos novatos.
3. **Tagline drift** catálogo vs YAML en lighthouse, interactive-lab, geo-lab (marketing vs sala).
4. **interactive-lab** pistas demo con cifras fijas — coherencia advierte disclaimer.
5. **Sin soft-lock** mecánico detectado en salas P0 (coherence win-path OK).

## Tabla resumen de corridas

Ver JSON anexo. Victorias **exploratorias**: 0. Victorias **replay**: pilot, lighthouse, interactive-lab, geo-lab, evento Sara, GM persistence tras reload.

## Detalle destacado

### Catálogo `pilot` — `eq-experto` — `deterministic_replay`

- `firstProgressTime`: 613 ms (**instrumentado**).
- `wrongAttempts`: 1 (métricas experience-metrics).
- Pistas (estática): `lockbox` N1–N2 orientan; N3 **spoiler**; `intercom_tone` N1 adecuada.
- Provenance: YAML **static**; sensory **template** con demo.

### Evento `birthday` (Sara) — `eq-mixto` — `deterministic_replay`

- `firstProgressTime`: 5284 ms.
- `gmLinesBeforeFirstSolve`: 14 (incluye líneas durante recorrido largo; baseline sin LLM).
- Personalización **funcional**: `entry_lock` 1995, códigos derivados (`generate-adventure.test.ts` valida patrón 1815/ALAE en otro subject).

### Multiequipo — `events-mvp` (replay)

- Dos equipos, mismo `joinCode`, nombres distintos — **verificado en spec**.
- **No verificado en esta pasada:** inventario aislado puzzle a puzzle entre contextos; join tardío.

### GameMaster — baseline

- LLM: **no_configurado**.
- Fallback estático activo; 2 líneas GM antes del primer acierto en pilot/lighthouse (métricas).
- `gamemaster-reload`: GM visible tras reload + victoria pilot — **replay OK**.

### Exploratorio — `eq-novatos` — `pilot` (**computerUse, 18-nov**)

- **Duración ~14 min.** Resolvieron entrada completa (timbre + susurro fallido + candado con 2 pistas). **1984** inferido del hint «año distópico» (no del YAML).
- **5 fallos** antes de progreso estable; **hintDependency** alta en sensibles.
- **Notas cualitativas:** dificultad **7**, historia **8**, pistas **7** (ver detalle en JSON `exploratory-pilot-novatos-computerUse`).
- **Bloqueo reportado:** al pulsar salida a «Cuarto de correspondencia», pantalla en blanco + consola `Maximum update depth exceeded`.
- **Contraste:** inmediatamente después, `catalog-pilot-win.spec.ts` **pasa** (incluye `mailroom`) en el mismo `main` — tratar como **P0 a investigar** (orden de puzzles, HMR, o estado browser) hasta reproducir fiable.
- UX: micrófono sin guía clara tras fallo; pitido→cifra poco obvio sin relectura.

Cronología resumida: fallos 0000/1234 en timbre → pista pitido → candado con hint Orwell → timbre «1» → salida → **crash reportado**.

## Matriz dificultad (instrumentado donde existe)

| Juego | 1.er progreso (ms) | Win replay | Fallos en spec métricas |
| ----- | ------------------ | ---------- | ----------------------- |
| pilot | 613 | Sí | 1 |
| lighthouse | 3232 | Sí | — |
| interactive-lab | 4297 | Sí | — |
| geo-lab | 2087 | Sí | — |
| event Sara | 5284 | Sí | 1 |

## Comparación con `experience-eval` y coherencia

- Global **9,86** — pilot/lighthouse/GM persistence en **~10**; interactive-lab y evento con gaps de escenas/`timeToFirstPuzzle`.
- Playtest cualitativo **no contradice** la nota objetiva; añade: pistas N3 spoil, clue-ledger eventos, tagline drift.
- `audit-coherence` sin errores bloqueantes; warnings priorizados en backlog.

## Limitaciones de esta ejecución

1. ~~Build workspace roto en `apps/web`.~~ (`pnpm --filter @escapeai/web typecheck` OK en B.3).
2. Fase D exploratoria: **parcial** (pilot, office, lighthouse automatizados; labs manual/mock).
3. Sin evaluación LLM del GM.
4. Sin scanner / site multihabitación jugado.
5. Segundo payload custom por `mystery|team|celebration` solo en auditoría, no lobby.

## Backlog (máx. 10, sin implementar aquí)

1. ~~Arreglar `clue-ledger` → `token_slot` en generador.~~ (hints `numeric_*` + test `clue-ledger.test.ts`)
2. ~~Rebajar spoiler N3 en puzzles producción (pilot `lockbox`).~~
3. ~~E2E join tardío y aislamiento inventario A/B.~~ (`events-late-join.spec.ts`)
4. ~~Spec scanner `escape-scanner-*`.~~ (`scanner-flow-smoke.spec.ts`)
5. ~~`playtestMatrix.json` + spec custom events serial.~~ (`custom-events-serial.spec.ts`)
6. ~~Exploratorio automatizado con sesión ciega (sin leer YAML).~~ (`playtest-blind-pilot-entry.spec.ts`)
7. ~~Unificar taglines catálogo/YAML o documentar marketing.~~ (`ROOM_CATALOG` alineado a YAML)
8. ~~Arreglar `pnpm build` web/vitest en CI local.~~ (typecheck web verde; tests web vía `vitest run` en paquete).
9. ~~Diff facts automatizado post-audit.~~ (`pnpm playtest:facts-diff`, B.1)
10. ~~Ponderar playtest cualitativo en matriz (P2 roadmap).~~ (`playtestQualitativeBlend` en `experience-eval:score`)

## Anexo

**Comandos ejecutados:**

```bash
pnpm validate-rooms
pnpm audit-coherence
pnpm --filter @escapeai/escape-content build
pnpm --filter @escapeai/escape-engine test
CI=1 pnpm test:e2e
pnpm experience-eval:signals && pnpm experience-eval:score
```

**Artefactos:** `e2e/.cache/playtest-grupo-runs.json`, `e2e/.cache/experience-metrics.json`, `e2e/.cache/experience-scores.json`, `docs/coherencia-partidas-informe.md` (regenerado por audit).