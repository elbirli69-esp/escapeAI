# Informe playtest en grupo — 2026-11-18

Ejecución según [prompt-playtest-grupo.md](./prompt-playtest-grupo.md). El cuerpo del informe se **versiona en repo**; los JSON de corrida en `e2e/.cache/` siguen siendo locales salvo export explícito.

> **Renovación snapshot — 2026-11-21 (Europe/Madrid):** `pnpm playtest:replay playtest-blind` (5/5) + `pnpm playtest:snapshot` → `e2e/.cache/playtest-snapshot.json` (`gitSha` `1d5356d`, `catalogGaps` 0).
> **Infra previa:** B.1–B.3, Fase D ciego en catálogo, `playtest-coverage.json`, `custom-events-serial`, scanner smoke, join tardío.

## Resumen ejecutivo

| Concepto | Resultado (snapshot 2026-11-21) |
| -------- | -------------------------------- |
| `gitSha` / rama | `1d5356d` / `main` |
| Corridas `playtest-grupo-runs.json` | **10** (`exploratory`: 10 · `deterministic_replay`: 0 en caché local) |
| Suite `playtest-blind` | **5/5** PASS (~18 s, corrida local) |
| `audit-coherence` | **0 errores**, **0 warnings** (post-taglines / clue-ledger) |
| `facts-diff` | OK (`playtest:facts-diff`) |
| `experience-eval` global | **9,86/10** (corrida histórica 2026-11-18; re-ejecutar opcional) |
| LLM | **no_configurado** (`OPENAI_*` / `DEEPSEEK_*` ausentes) |

### Cobertura vs §4 del prompt

| Requisito | Estado |
| --------- | ------ |
| Catálogo jugable (5 + demo) | **OK** replay E2E en las 6 entradas de `playtest-coverage.json` |
| Exploratorio ciego catálogo | **OK (parcial)** — 5/5 salas con spec `playtest-blind-*` (`partialWin`, sin victoria ciega completa) |
| 4 `adventureType` | **Parcial** — API serial (`custom-events-serial`) + audit; UI lobby sigue centrado en `birthday` |
| 2 payloads / tipo en UI | **Parcial** — segundo payload solo estático/API |
| Perfiles equipo | **Parcial** — `eq-novatos`, `eq-sensorial`, `eq-experto` cubiertos en specs ciegos; falta narrativa `eq-mixto` exploratoria |
| Victorias exploratorias completas | **0** (por diseño: corridas ciegas acotadas) |
| Scanner | **Parcial** — `scanner-flow-smoke.spec.ts`; generación espacial sin playtest grupo |

**Tabla catálogo (fuente: snapshot):**

| `roomId` | Replay | Exploratorio ciego |
| -------- | ------ | ------------------ |
| `pilot` | `catalog-pilot-win` | `playtest-blind-pilot-entry` |
| `office` | `catalog-office-win` | `playtest-blind-office-entry` |
| `lighthouse` | `catalog-lighthouse-win` | `playtest-blind-lighthouse-entry` |
| `interactive-lab` | `interactive-lab-partial` | `playtest-blind-interactive-lab` |
| `geo-lab` | `geo-lab-mocked` | `playtest-blind-geo-lab` |
| `demo-michelon` | `p6-demo-lobby` | — |

**Eventos (API / replay):** `birthday` (UI + replay), `mystery` / `team` / `celebration` con `custom-events-serial` + replays P6 donde aplica.

**Conclusión DoD:** Fase **B + D automatizada** cubierta en CI; quedan victoria exploratoria completa, lobby multi-tipo y playtest espacial/manual ampliado.

## Referencias verificadas / gaps

- `pnpm validate-rooms` → OK (6 YAML catálogo).
- `pnpm audit-coherence` → informe `docs/coherencia-partidas-informe.md` (**0** errores en snapshot).
- `pnpm build` → OK en CI local (2026-11-21).
- `pnpm playtest:replay playtest-blind` → 5/5.
- `pnpm playtest:snapshot` → `e2e/.cache/playtest-snapshot.json`.
- `pnpm --filter @escapeai/escape-engine test` → 21 tests OK.
- `generateAdventureRoom` en CLI tsx → error exports `@escapeai/shared`; usado **vitest** `generate-adventure.test.ts`.
- GM baseline: `escape-gm-line`, métricas `gmLinesBeforeFirstSolve` ≥ 2 en catálogo P0.
- Pistas UI: botón «Pedir pista» (no `escape-hint`).

## Hallazgos P0 / producto

1. ~~**clue-ledger** / `token_slot`.~~ Resuelto en main (tests + hints).
2. ~~**lockbox N3 spoiler**.~~ Rebajado en playtest debt B.
3. ~~**Tagline drift**.~~ `ROOM_CATALOG` alineado a YAML.
4. **interactive-lab** pistas demo con cifras fijas — vigilar fair play (corridas ciegas usan pistas/trial acotado).
5. **Sin soft-lock** mecánico en salas P0 en última audit.
6. **Victoria ciega completa** no automatizada (labs/geo cortan antes del win).

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
- Playtest cualitativo automatizado alimenta `playtestQualitativeBlend` vía `playtest-grupo-runs.json`.
- `audit-coherence` sin warnings en snapshot `1d5356d` (regenerar tras cambios YAML).

## Limitaciones de esta ejecución

1. ~~Build workspace roto en `apps/web`.~~ (`pnpm --filter @escapeai/web typecheck` OK en B.3).
2. Fase D exploratoria: **automatizada parcial** en las 5 salas catálogo (sin victoria ciega completa en labs).
3. Sin evaluación LLM del GM.
4. Sin scanner / site multihabitación jugado.
5. Segundo payload custom por `mystery|team|celebration` en lobby UI (API E2E sí).

## Backlog playtest (post B + D)

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

**Abierto (siguiente tanda):**

1. Exploratorio ciego con **victoria** en al menos una sala (sin fixture win).
2. Lobby UI para `mystery` / `team` / `celebration` (2º payload visible).
3. Playtest grupo **GM con LLM** cuando haya secretos en entorno.
4. Regenerar **`experience-eval`** tras suite ampliada y cruzar con snapshot.

## Anexo — corrida 2026-11-21

**Comandos:**

```bash
pnpm build
pnpm playtest:replay playtest-blind
pnpm playtest:snapshot
```

**Artefactos locales (no commiteados por defecto):**

- `e2e/.cache/playtest-snapshot.json` — cobertura §4 + auditorías
- `e2e/.cache/playtest-grupo-runs.json` — corridas `exploratory` de specs ciegos
- `e2e/.cache/facts-personalization-diff.json`
- `docs/coherencia-partidas-informe.md` (regenerado por `audit-coherence`)