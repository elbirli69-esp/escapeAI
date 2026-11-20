# PROMPT — Playtest en grupo (v2): modalidades, multiequipo y auditoría reproducible (escapeAI)

**Rol:** arquitecto de QA de escape rooms digitales — simulación de grupos, Playwright E2E, evaluación narrativa, personalización procedural y GameMaster (baseline vs LLM).  
**Objetivo:** ejecutar una auditoría **reproducible** que complemente (sin sustituir) `experience-eval`, `audit-coherence` y `pnpm test:e2e`, distinguiendo **playtest exploratorio**, **replay determinista** y **auditoría estática**.  
**Restricción de ejecución:** esta pasada **no modifica** motor, YAML, fixtures, tests ni dependencias; solo lee, ejecuta herramientas existentes y genera informes locales.

**Complementa (lectura previa obligatoria):**

| Documento | Aporta |
| --------- | ------ |
| [prompt-partidas-reales-jugadores.md](./prompt-partidas-reales-jugadores.md) | **Partidas reales** con jugadores simulados (conocimiento, veredicto dificultad/coherencia/jugabilidad) |
| [prompt-e2e-experiencia-jugable.md](./prompt-e2e-experiencia-jugable.md) | Rúbrica 0–10 objetiva, `experience-matrix.json`, cap por e2e rojo |
| [prompt-coherencia-partidas.md](./prompt-coherencia-partidas.md) | Criterios mecánica/narrativa; `pnpm audit-coherence` |
| [prompt-playwright-e2e.md](./prompt-playwright-e2e.md) | Reglas E2E, specs, `webServer` API 8787 + Vite 5173 |
| [prompt-custom-events.md](./prompt-custom-events.md) | API eventos, sesiones por jugador, leaderboard |
| [prompt-entretenimiento-er.md](./prompt-entretenimiento-er.md) | Criterios de diseño ER |

**Salidas (no commitear por defecto):**

- Informe: `docs/playtest-grupo-informe.md`
- Corridas: `e2e/.cache/playtest-grupo-runs.json` (esquema §8)

**Documento anterior:** `prompt-playtest-grupo-y-custom.md` queda **superseded** por este archivo.

---

## 0. Auditoría previa del repositorio (obligatoria)

Antes de cualquier corrida, el agente debe **verificar en código** las referencias de este prompt. Registrar hallazgos en el informe, sección **«Referencias verificadas / gaps»**.

### 0.1 Comandos reales (raíz del monorepo)

| Comando | Existe | Qué hace |
| ------- | ------ | -------- |
| `pnpm validate-rooms` | Sí | `packages/escape-content` — estructura YAML |
| `pnpm audit-coherence` | Sí | Informe coherencia (consola; puede escribir `docs/coherencia-partidas-informe.md`) |
| `pnpm audit-fisico` | Sí | Inventario físico (opcional playtest) |
| `pnpm test` | Sí | Tests unitarios workspace (`escape-engine`, `api`, `escape-content`, …) |
| `pnpm test:e2e` | Sí | Playwright en `e2e/specs/` |
| `pnpm experience-eval` | Sí | `build` + signals + e2e + score + report |
| `pnpm experience-eval:score` | Sí | Lee `e2e/.cache/experience-metrics.json` + matriz + rúbrica |
| `pnpm experience-eval:signals` | Sí | Señales de contenido → `e2e/.cache/experience-signals.json` |
| `pnpm playtest:replay <suite>` | Sí | Suites en `e2e/playtest-matrix.json` |
| `pnpm playtest:partidas` | Sí | `partidas-reales-runner.spec.ts` |
| `e2e/playtest-matrix.json` | Sí | Salas, payloads y suites de replay (§5, §15) |
| Script CLI `generate-spatial` | **No** | Solo tests: `packages/escape-content/src/spatial/generate-spatial.test.ts` |

### 0.2 Specs Playwright verificados (`e2e/specs/`)

| Archivo | Rol en playtest |
| ------- | ---------------- |
| `smoke.spec.ts` | Health + catálogo + fallo en puzzle |
| `catalog-pilot-win.spec.ts` | Replay victoria pilot |
| `catalog-lighthouse-win.spec.ts` | Replay victoria lighthouse |
| `interactive-lab-partial.spec.ts` | **Replay victoria** vía `playInteractiveLabToWin` (el nombre «partial» es legacy) |
| `geo-lab-mocked.spec.ts` | Geo mock + victoria |
| `events-mvp.spec.ts` | 2 equipos, sesiones distintas, candado |
| `events-full-win.spec.ts` | Victoria evento fixture Sara |
| `organizer-panel.spec.ts` | Panel organizador / ranking |
| `resume-session-banner.spec.ts` | Reanudar sesión |
| `gamemaster-reload.spec.ts` | GM tras reload (evento + pilot clásico) |
| `experience-metrics.spec.ts` | Métricas para `experience-eval` (serial) |
| `catalog-office-win.spec.ts` | Victoria catálogo oficina + whodunit |
| `mailroom-entry-regression.spec.ts` | Regresión navegación pilot → mailroom |
| `partidas-reales-runner.spec.ts` | Partidas simuladas + JSON veredictos |
| `pilot-exploratory-order.spec.ts` | Orden malo playtest novatos |
| `p5-hybrid.spec.ts` | Prep organizador + token mobile_only |
| `p6-demo-lobby.spec.ts` | Demo Michelón desde lobby |
| `p6-whodunit.spec.ts` | Mystery generado + acusación |
| `p6-asymmetric-roles.spec.ts` | Dos sesiones por rol |
| `p6-saga-two-acts.spec.ts` | Saga + release acto 2 |

**Scanner:** `scanner-flow-smoke.spec.ts` (wizard sin cámara → guardar). Captura con detector en CI sigue siendo opcional/manual.

### 0.3 Fixtures E2E verificados (`e2e/fixtures/`)

| Fixture | Uso |
| ------- | --- |
| `game.ts` | Lobby, puzzles, `submitAnswer`, `moveToScene`, `completeSoundListen`, `data-testid` UI |
| `pilot-win.ts`, `office-win.ts`, `lighthouse-win.ts`, `interactive-lab-win.ts`, `geo-lab-win.ts`, `demo-michelon-win.ts` | **Replay determinista** |
| `event-win-path.ts`, `events.ts` | `SARA_EVENT`, `createEventFromLobby`, `playSaraEventToWin` |
| `experience-metrics-io.ts` | Escritura `e2e/.cache/experience-metrics.json` |
| `media-mock.ts`, `routes.ts` | Cámara/geo en CI |

**Corrección v1 del prompt:** no existe `data-testid="escape-hint"`. Pistas en UI: botón **«Pedir pista (n/m)»** en `InteractivePuzzle.tsx` (`type: "request_hint"`). Exploratorio debe localizarlo por rol/texto.

### 0.4 Matriz y evaluación objetiva

- `e2e/experience-matrix.json` — perfiles ponderados (pilot, lighthouse, labs, evento, resume, gamemaster-persistence).
- `e2e/rubric-components.json` + `e2e/scripts/experience-rubric.ts` — fórmulas deterministas.
- **No confundir** notas `experience-eval` con juicio cualitativo del playtest: cruzar y explicar desvíos.

### 0.5 Generación de eventos

- Motor: `packages/escape-content/src/generate-adventure.ts` — `generateAdventureRoom(input)`.
- Tipos: `birthday` | `celebration` | `mystery` | `team` (ver `prompt-custom-events.md`).
- E2E creación evento: **solo UI lobby** vía `createEventFromLobby` (plantilla UI actual: flujo «Homenaje personal» / `SARA_EVENT`; el estado React `adventureType` existe en `ExperienceLobby.tsx` pero el fixture E2E fija plantilla birthday).
- **Payload JSON en lobby v2 del prompt:** para tipos no cubiertos por UI E2E, usar **auditoría estática** (`generateAdventureRoom` con dos inputs distintos en script **ad hoc** de lectura) o `POST /api/events` **solo si** el agente verifica el contrato en `apps/api/src/events-routes.ts` — no asumir campos sin leer la ruta.

### 0.6 Multiequipo y backend

- API documentada: sesiones por `eventCode` + `playerId` (equipo); sin estado compartido en tiempo real (`prompt-custom-events.md`).
- Verificación E2E existente: `events-mvp.spec.ts` (dos contextos, códigos de unión iguales, nombres distintos).
- **Obligatorio en playtest multiequipo:** comparar `localStorage` (`escapeai.sessionId`) y, si es posible, `GET /api/sessions/:id` entre equipos — no basta con nombres diferentes.

### 0.7 GameMaster / LLM

- Implementación: `apps/api/src/gamemaster/` (`service.ts`, `fallbacks.ts`, `provider.ts`).
- LLM: `resolveLlmConfig()` en `apps/api/src/llm-config.ts` — si devuelve vacío → **baseline estático** (`meta.provider: "static"`, logs `gm_fallback`).
- UI: líneas con `data-testid="escape-gm-line"`.
- **Regla:** sin API key / sin proveedor en entorno → marcar `llmStatus: "no_configurado"` y evaluar **solo baseline** (triggers, frecuencia, coherencia con escena, no spoilers en fallbacks leídos en código o capturados en UI).

---

## 1. Tres modalidades de evaluación (`executionMode`)

Cada entrada en `playtest-grupo-runs.json` **debe** incluir exactamente uno de:

| `executionMode` | Qué es | Cuenta como «grupo descubrió la solución» |
| --------------- | ------ | ---------------------------------------- |
| `exploratory` | Agente/jugador simulado **sin** usar respuestas de fixtures; lee UI/YAML visibles, prueba hipótesis, falla según perfil, pide pistas si hay UI | **Sí** (solo esta modalidad) |
| `deterministic_replay` | Ejecuta `playPilotToWin`, `playSaraEventToWin`, specs win, etc. | **No** — etiquetar siempre como replay |
| `static_audit` | `audit-coherence`, diff de `generateAdventureRoom`, lectura de hints en YAML, grafos sin UI | **No** — no es partida jugada |

**Prohibido:** presentar un replay como descubrimiento exploratorio.

Si el entorno impide exploratorio (p. ej. sin tiempo para UI manual), documentar `limitations` y no rellenar `won: true` exploratorio.

### 1.1 Playtest exploratorio (procedimiento)

1. `clearGameStorage` + `stubMediaRoutes` (mismas reglas que [prompt-playwright-e2e.md](./prompt-playwright-e2e.md)).
2. Entrar en sala o evento **sin** importar fixtures `*-win.ts`.
3. Por escena: leer narrativa visible (`escape-narrative-log`, descripciones, pestañas puzzle).
4. Por puzzle: intentar interacciones válidas (`submit_answer`, sensoriales, inventario, **Pedir pista**).
5. Registrar cada hipótesis, fallo y cambio de estrategia en `evidence[]`.
6. **No leer** `answer` en YAML durante exploratorio salvo en fase estática separada.

### 1.2 Replay determinista (procedimiento)

1. Ejecutar spec o fixture documentado.
2. Objetivo: regresión funcional y tiempos instrumentados (Playwright).
3. `won` puede ser `true` solo con `executionMode: deterministic_replay`.

### 1.3 Auditoría estática (procedimiento)

1. `pnpm validate-rooms` + `pnpm audit-coherence`.
2. Para personalización: invocar `generateAdventureRoom` dos veces (mismos campos salvo `facts`) y diff estructural (escenas, `answer`, hints, beats) — sin commitear scripts nuevos; puede ser sesión REPL `pnpm --filter @escapeai/escape-content exec tsx` con snippet **solo lectura**.
3. Pistas: recorrer `puzzles[].hints[]` en YAML o room generada; clasificar niveles (§5).

---

## 2. Qué aporta cada herramienta existente (no duplicar trabajo)

| Herramienta | Detecta bien | No sustituye el playtest en |
| ----------- | -------------- | --------------------------- |
| `pnpm test:e2e` | Regresión UI, victorias conocidas, GM reload, multisession básica | Curva de frustración exploratoria, calidad literaria de pistas, rol social del grupo |
| `pnpm experience-eval:score` | Métricas agregadas 0–10, plan de gaps numéricos | Juicio «¿el equipo lo habría abandonado?» |
| `pnpm audit-coherence` | Grafos, prefijos sonido→candado, inconsistencias mecánicas | UX de pista en UI, LLM conversacional |
| Playtest v2 | Modalidades, evidencias, multiequipo profundo, personalización real vs cosmetic | — |
| [prompt-partidas-reales-jugadores.md](./prompt-partidas-reales-jugadores.md) | Veredicto cualitativo por partida real (sessionId, perfiles conocimiento); **no** sustituye replay CI |

---

## 3. Simulación de equipos y roles

### 3.1 Perfiles obligatorios (conservar v1)

| `teamId` | Tamaño | Perfil |
| -------- | ------ | ------ |
| `eq-novatos` | 3–4 | 2–3 fallos por puzzle difícil; pide pista si atascados; poca lectura del diario |
| `eq-mixto` | 4 | 1 fallo; alterna pestañas; `talk_to_character` si hay personaje |
| `eq-experto` | 2 | Exploratorio agresivo; evita pistas |
| `eq-familia` | 5 | Prioriza sensoriales; sensibilidad a textos largos |
| `eq-org` | 1 | Crea evento, panel organizador; no juega la partida completa salvo verificación |

### 3.2 Roles de colaboración (simulados — narrativa del agente)

No hay chat entre jugadores en la app. Los roles son **comportamiento del agente** que redacta el informe (no implican UI multiusuario salvo lo ya existente: un jugador por contexto Playwright).

| Rol | Comportamiento simulado |
| --- | ---------------------- |
| Líder | Fija orden de puzzles y fuerza siguiente paso |
| Explorador | Abre todas las pestañas y escenas antes de resolver |
| Lector de documentos | Extrae pistas del diario y beats |
| Hipotético | Propone respuestas alternativas razonables |
| Comunicador incompleto | (solo grupos ≥3) «olvida» mencionar una pista vista en diario |

Incluir en informe: desacuerdo simulado, revisión de hipótesis descartadas, decisión de pedir ayuda.

**Límite real:** una sesión Playwright = un móvil. Multiequipo = **varios contextos**, no varios roles simultáneos en una misma sesión.

---

## 4. Cobertura objetivo (mínimo v2)

Si no se alcanza, el informe lista **faltantes exactos** (sin declarar DoD cerrado):

| Eje | Meta |
| --- | ---- |
| Catálogo | 5 salas jugables: `pilot`, `office`, `lighthouse`, `interactive-lab`, `geo-lab` + demo `demo-michelon` |
| Tipos evento | 4× `adventureType`, **2 payloads** cada uno (Sara = 1; otro distinto vía estática o API verificada) |
| Perfiles | 5 `teamId` documentados al menos una vez |
| Modalidades | Cada sala P0: ≥1 exploratorio **o** limitación documentada; ≥1 replay; ≥1 estática |
| Victoria | Documentar `won` y `partialWin` por corrida |

---

## 5. Matriz de escenarios (referencias verificadas)

### 5.1 Catálogo

| `roomId` | Replay (spec / fixture) | Notas exploratorio |
| -------- | ------------------------ | ------------------ |
| `pilot` | `catalog-pilot-win.spec.ts`, `pilot-win.ts` | Sensorial + mailroom + candado |
| `office` | `catalog-office-win.spec.ts`, `office-win.ts` | Hub investigación + `office_accusation` |
| `lighthouse` | `catalog-lighthouse-win.spec.ts`, `lighthouse-win.ts` | Cadena sound/visual/voice |
| `interactive-lab` | `interactive-lab-partial.spec.ts`, `interactive-lab-win.ts` | Requiere `mockCameraForPlaywright` |
| `geo-lab` | `geo-lab-mocked.spec.ts`, `geo-lab-win.ts` | Permisos geolocation en contexto |

### 5.2 Eventos

| Fuente | Tipo | Modalidad recomendada |
| ------ | ---- | --------------------- |
| `SARA_EVENT` en `e2e/fixtures/events.ts` | `birthday` (UI) | Replay: `events-full-win`, `playSaraEventToWin` |
| Payload alterno | `mystery` / `team` / `celebration` | Estática: `generateAdventureRoom` + coherence; exploratorio solo si hay camino UI/API verificado |

### 5.3 Scanner / espacial (gap conocido)

| Componente | Ruta | Playtest |
| ---------- | ---- | -------- |
| Scanner UI | `apps/web/src/scanner/ScannerFlow.tsx` | Manual o futuro E2E |
| Generación espacial | `packages/escape-content/src/spatial/` | `pnpm --filter @escapeai/escape-engine test` incluye tests espaciales; `generate-spatial.test.ts` |
| Site map en juego | `escape-spatial-room-label`, `SpatialSitePlayMap` | Solo si partida cargada con sala site |

### 5.4 Variante diaria

- Código: `packages/escape-content/src/daily-variant.test.ts`, `applyCatalogDailyVariant`.
- Modalidad: **solo estática** (dos fechas, comparar puzzles afectados).

---

## 6. Dimensiones cualitativas (0–10) + métricas de frustración

### 6.1 Dimensiones (cada nota exige `evidence[]`)

| Campo JSON | Dimensión |
| ---------- | --------- |
| `storyScore` | Coherencia narrativa |
| `difficultyScore` | Dificultad percibida |
| `hintsScore` | Calidad y progresión de pistas |
| `mechanicsScore` | Variedad y enseñanza de mecánicas |
| `groupUxScore` | Multiequipo, GM, reload, permisos |
| `coverageScore` | Personalización y huecos de generación |

Escala verbal: igual que [prompt-e2e-experiencia-jugable.md](./prompt-e2e-experiencia-jugable.md).

### 6.2 Métricas de frustración y progreso

Registrar en cada corrida. Para cada campo, indicar `measurementKind`: `instrumented` | `calculated` | `estimated` | `N/D`.

| Campo | Definición |
| ----- | ---------- |
| `blockedTime` | Tiempo sin progreso significativo (instrumentado si Playwright cronometra; si no, estimado y marcado) |
| `repeatedAttempts` | Respuestas repetidas sin nueva información |
| `confusionEvents` | Hipótesis razonables rechazadas por el juego (con texto de feedback) |
| `hintDependency` | Avance solo tras pista manual (`request_hint`) |
| `perceivedProgress` | Juicio 0–10 con evidencia (diario, escenas desbloqueadas) |
| `simulatedAbandonment` | Minuto o puzzle donde el perfil abandonaría (hipótesis, no dato técnico) |
| `recoveryTime` | Desde bloqueo hasta siguiente hito (instrumentado o estimado) |

Clasificar cada bloqueo:

- `blockageCause`: `legitimate_difficulty` | `unclear_clarity` | `player_error` | `system_error` | `soft_lock`

**Soft-lock:** documentar puzzle/estado, condición de salida imposible, y si `audit-coherence` lo cubre.

---

## 7. Auditoría de pistas (obligatoria en estática y/o exploratorio)

Por cada puzzle del recorrido jugado o auditado:

1. ¿Existe `hints[]` y `maxHints`?
2. Por nivel (1..n): comparar texto con `answer`, `normalize`, `voiceMatchMode`, pistas cruzadas.
3. Escala objetivo:
   - **N1:** orientación conceptual (sin solución).
   - **N2:** apunta elemento o relación concreta.
   - **N3:** ayuda decisiva sin spoiler innecesario (si N3 = respuesta literal → marcar error de contenido).
4. ¿Victoria posible sin llegar a N3?
5. Separar:
   - `hintContentErrors` (YAML/contenido)
   - `hintUiErrors` (botón no visible, agotado `hintsUsed`, acción rechazada)

Exploratorio: intentar **Pedir pista** y registrar `hintsUsed[]` con nivel inferido del orden de revelación.

---

## 8. Personalización real de eventos

### 8.1 Taxonomía (`artifactProvenance`)

Por artefacto (escena, puzzle, answer, item, hint, character, beat, victoria, cover, diálogo GM):

`static` | `derived_from_facts` | `derived_from_subject` | `derived_from_spatial` | `template` | `placeholder`

### 8.2 Protocolo comparación facts

1. Input **A** y **B** idénticos salvo `facts` (y derivados directos si el generador los lee).
2. Diff con `generateAdventureRoom` (estático).
3. Clasificar cada cambio: superficial (solo nombre) vs funcional (answers, grafo, hints, puzzles).
4. Comprobar win-path en A y B vía `audit-coherence` o test `generate-adventure.test.ts` — **no asumir** sin ejecutar coherence.

**Regla:** incluir el nickname en el título **no** cuenta como personalización funcional por sí solo.

---

## 9. Auditoría multiequipo (eventos)

Checklist — marcar `verified` | `failed` | `N/D` con evidencia:

| Ítem | Cómo verificar |
| ---- | -------------- |
| Sesiones independientes | `events-mvp.spec.ts` o dos `browser.newContext()` + `joinEventAsTeam` |
| `sessionId` distinto | `localStorage` tras join |
| Inventario independiente | Acciones en A no cambian estado en B (mismos puzzles, estados distintos) |
| Pistas independientes | `hintsUsed` por sesión (exploratorio) |
| Victoria independiente | Un equipo `won` no fuerza victoria al otro (`GET leaderboard` si disponible) |
| Aislamiento | Misma `joinCode`, distinto `playerId`/nombre equipo |
| Leaderboard | API `GET /api/events/:code/leaderboard` + UI organizador (`organizer-panel.spec.ts`) |
| Reload | `gamemaster-reload.spec.ts` (GM); extender documentación para evento si se prueba |
| Nuevo equipo tardío | Unir tras progreso del primero — **N/D** en E2E actual; documentar si no se prueba |

---

## 10. GameMasterAI

### 10.1 Baseline (siempre)

- Triggers conocidos (p. ej. `SESSION_STARTED`, `SCENE_ENTERED` — ver tests `api-routes.test.ts`).
- Conteo `escape-gm-line` antes del primer acierto (como `experience-metrics.spec.ts`).
- Texto fallback en `apps/api/src/gamemaster/fallbacks.ts` — revisar spoilers literales.
- Coherencia con escena actual (sin conocer solución en informe exploratorio).

### 10.2 Con LLM (solo si `resolveLlmConfig()` activo en el entorno)

Evaluar: utilidad, contexto, personalización, consistencia, resistencia a peticiones de solución (exploratorio con `talk_to_character` o inputs que piden «dime el código»).

Si no hay proveedor: `llmStatus: "no_configurado"` — **no penalizar** narrativa por ausencia de LLM.

---

## 11. Procedimiento por fases (orden fijo)

### Fase A — Baseline técnica (sin informe cualitativo aún)

```bash
pnpm install
pnpm build
pnpm validate-rooms
pnpm audit-coherence
pnpm test
CI=1 pnpm test:e2e
```

Opcional cruzado: `pnpm experience-eval:score` (requiere corridas `experience-metrics.spec.ts` en el mismo `test:e2e`).

### Fase B — Auditoría estática (catálogo + eventos)

- Coherence + lectura hints + comparación `generateAdventureRoom` (2 facts).
- Registrar runs con `executionMode: static_audit`.

### Fase C — Replay determinista

- Ejecutar specs/fixtures §5; `executionMode: deterministic_replay`.
- Tiempos = `measurementKind: instrumented`.

### Fase D — Exploratorio por perfil

- Por sala/evento P0 y perfiles §3.1 (priorizar `eq-novatos`, `eq-mixto`, `eq-experto`).
- `executionMode: exploratory`.
- Si atascado &gt; umbral del perfil, registrar `simulatedAbandonation` aunque se complete después vía pista.

### Fase E — Multiequipo y GM

- Repetir C/D en eventos + checklist §9.
- GM: baseline + condición LLM §10.

### Fase F — Informe y JSON

- Redactar `docs/playtest-grupo-informe.md`.
- Añadir runs a `e2e/.cache/playtest-grupo-runs.json` (array acumulativo o por ejecución con `runId`).

---

## 12. Formato informe Markdown

```markdown
# Informe playtest en grupo — {ISO date}

## Resumen
- Corridas por executionMode
- Cobertura vs §4 (tabla cumplimiento)
- experience-eval global (si disponible): X/10
- LLM: configurado | no_configurado

## Referencias verificadas / gaps
- Lista de rutas/comandos comprobados en §0

## Hallazgos P0 (soft-locks, multiequipo roto, pistas contradictorias)

## Por corrida (tabla resumen)

## Detalle por sala / evento

### {roomId|eventId} — {teamId} — {executionMode}
- Métricas frustración
- Pistas (por puzzle)
- Personalización (tabla provenance)
- Evidencias (enlaces testid, líneas YAML, timestamps)

## Multiequipo

## GameMaster (baseline / LLM)

## Comparación con experience-eval y audit-coherence

## Limitaciones de esta ejecución

## Backlog (máx. 10, sin implementar aquí)

## Anexo: gitSha, branch, comandos
```

---

## 13. Esquema JSON (`e2e/.cache/playtest-grupo-runs.json`)

Array de objetos. Campos obligatorios marcados con `*`.

```json
{
  "schemaVersion": 2,
  "runs": [
    {
      "runId": "uuid",
      "timestamp": "ISO-8601",
      "gitSha": "string",
      "branch": "string",
      "roomId": "pilot|null",
      "eventId": "joinCode|null",
      "adventureType": "birthday|null",
      "teamId": "eq-novatos",
      "teamSize": 4,
      "teamProfile": "texto breve",
      "executionMode": "exploratory|deterministic_replay|static_audit",
      "won": false,
      "partialWin": false,
      "firstProgressTime": { "valueMs": 0, "measurementKind": "instrumented" },
      "completionTime": { "valueMs": null, "measurementKind": "N/D" },
      "wrongAttempts": 2,
      "hintsUsed": [{ "puzzleId": "lockbox", "levelInferred": 1, "measurementKind": "instrumented" }],
      "blockedTime": { "valueMs": null, "measurementKind": "estimated" },
      "repeatedAttempts": 1,
      "confusionEvents": [{ "puzzleId": "x", "hypothesis": "...", "feedback": "..." }],
      "hintDependency": false,
      "perceivedProgress": 7,
      "simulatedAbandonment": null,
      "recoveryTime": { "valueMs": null, "measurementKind": "N/D" },
      "blockageCause": null,
      "storyScore": null,
      "difficultyScore": null,
      "hintsScore": null,
      "mechanicsScore": null,
      "groupUxScore": null,
      "coverageScore": null,
      "llmStatus": "no_configurado",
      "evidence": ["spec catalog-pilot-win L12", "screenshot N/D"],
      "limitations": [],
      "scoresMeasurementKind": "estimated"
    }
  ]
}
```

**Reglas JSON:**

- No inventar `valueMs` — usar `null` + `measurementKind: "N/D"`.
- Cualquier `won: true` en `deterministic_replay` no incrementa contador de victorias exploratorias en el resumen.
- `scores*` pueden quedar `null` en replays puros si solo se midió regresión.

---

## 14. Criterios de aceptación (DoD)

1. Ninguna victoria replay cuenta como exploratoria.
2. Cada nota cualitativa tiene entrada en `evidence`.
3. Cada tiempo indica `measurementKind`.
4. Soft-locks listados explícitamente.
5. Personalización medida por diff facts (§8).
6. Multiequipo verificado en estado backend, no solo nombres.
7. Limitaciones de simulación en `limitations`.
8. No afirmar funcionalidad sin verificación §0.
9. **No modificar motor/YAML/fixtures/tests** durante el playtest.
10. **No commitear** informe ni JSON salvo petición humana.

---

## 15. Evolución futura (no implementar en esta tarea)

### P0 — Fiabilidad del playtest

- Separación estricta de modalidades en CI.
- Perfiles de comportamiento en JSON.
- Auditoría de pistas automatizada (extensión `audit-coherence`).
- Detector soft-lock en grafo.
- Trazabilidad `evidence` → artefactos.

### P1 — Automatización

- ~~`e2e/playtest-matrix.json`~~ (implementado; ampliar payloads mystery/team).
- Volcado diario/GM/pistas post-partida.
- Diff sistemático de personalización.
- E2E multiequipo ampliado (join tardío).

### P2 — Inteligencia narrativa

- Evaluación GM con LLM en entorno con secrets.
- Variaciones narrativas A/B.
- Peso opcional en `experience-matrix.json`.

---

## 16. Restricciones (recordatorio)

- No implementar código ni modificar YAML/tests/fixtures/motor.
- No commits por defecto.
- No sustituir criterio humano por notas automáticas.
- No inventar resultados de corridas no ejecutadas.

---

## 17. Referencias rápidas (rutas verificadas)

| Recurso | Ruta |
| ------- | ---- |
| Salas YAML | `packages/escape-content/rooms/*.yaml` |
| Generador eventos | `packages/escape-content/src/generate-adventure.ts` |
| Coherencia | `packages/escape-content/src/audit-coherence.ts` |
| GM API | `apps/api/src/gamemaster/` |
| Eventos API | `apps/api/src/events-routes.ts` |
| Matriz experiencia | `e2e/experience-matrix.json` |
| Métricas runtime E2E | `e2e/.cache/experience-metrics.json` (generado por `experience-metrics.spec.ts`) |