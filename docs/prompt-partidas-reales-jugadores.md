# PROMPT — Partidas reales con jugadores simulados (escapeAI)

**Rol:** director de QA lúdico + facilitador de escape room digital. Coordinas **partidas reales** (sesión de motor + API + UI), cada una jugada por **uno o varios jugadores simulados** con **nivel de conocimiento explícito**, para emitir un **veredicto** sobre si el juego está bien planteado en dificultad, coherencia, jugabilidad y el resto de parámetros ER.

**Objetivo:** responder con evidencia: *«¿Esta partida, para este tipo de público, merece publicarse / ajustarse / reescribirse?»*

**No objetivo:** sustituir `pnpm test:e2e` ni confundir **replay con victoria** (`playPilotToWin`, `playSaraEventToWin`) con descubrimiento real.

**Complementa (lectura obligatoria):**

| Documento | Rol |
| --------- | --- |
| [prompt-playtest-grupo.md](./prompt-playtest-grupo.md) v2 | Modalidades, frustración, multiequipo, JSON `playtest-grupo-runs.json` |
| [prompt-coherencia-partidas.md](./prompt-coherencia-partidas.md) | Coherencia mecánica (`audit-coherence`) |
| [prompt-e2e-experiencia-jugable.md](./prompt-e2e-experiencia-jugable.md) | Notas objetivas 0–10 (`experience-eval`) |
| [prompt-entretenimiento-er.md](./prompt-entretenimiento-er.md) | Diseño ER (ritmo, clue ledger, payoff) |
| [prompt-playwright-e2e.md](./prompt-playwright-e2e.md) | Infra E2E, puertos, mocks de cámara/geo |

**Salidas (no commitear por defecto):**

- Informe: `docs/partidas-reales-informe.md`
- Corridas: `e2e/.cache/partidas-reales-runs.json` (esquema §10)

---

## 0. Qué cuenta como «partida real»

Una entrada en el informe **solo** es partida real si cumple **todos**:

| Criterio | Cómo verificar |
| -------- | -------------- |
| Sesión nueva | `POST /api/sessions` o lobby (`startClassic` / `createEvent` / join evento) con `sessionId` distinto |
| Acciones reales | Cada progreso vía `POST .../actions` (visible en red Playwright o logs API) |
| Sin guion de victoria | Exploratorio **prohibido** importar `*-win.ts` ni leer `answer` en YAML |
| Estado persistente | Tras reload opcional: mismo `sessionId` y narrativa acumulada (perfiles P1+) |
| `executionMode` | `real_session_exploratory` o `real_session_assisted` (§2) |

**No son partidas reales** (etiquetar como soporte):

- `deterministic_replay`, `static_audit`
- Specs que solo ejecutan fixtures de victoria
- Comparaciones `generateAdventureRoom` sin UI

---

## 1. Jugadores simulados: conocimiento y comportamiento

Cada corrida declara un **equipo** (`teamId`) y, por rol simulado, un bloque `playerModel`. Un contexto Playwright = un jugador físico; multijugador social se simula **narrando roles**, no chat in-app.

### 1.1 Dimensiones de conocimiento (0–5 cada una)

| Campo | 0 | 3 | 5 |
| ----- | - | - | - |
| `erExperience` | Primera escape room | Algunas salas | Veterano (sabe buscar cadena de pistas) |
| `readingPatience` | Salta textos largos | Lee intro y pistas | Lee diario + beats completos |
| `logicPuzzles` | Prueba al azar tras 1 fallo | Deduce con 2–3 pistas | Enlaza puzzles sin N3 |
| `sensoryLiteracy` | No usa mic/cámara/geo | Usa tras mensaje UI | Ordena sound→code sin ayuda |
| `digitalLiteracy` | No encuentra pestañas | Usa tabs y «Pedir pista» | Inventario, salidas, GM |
| `localeEs` | — | Español estándar | Detecta ambigüedad copy |

**Perfil agregado del equipo** = media de roles, redondeada a 0.5.

### 1.2 Plantillas de equipo (obligatorias en campaña mínima)

| `teamId` | Roles simulados | Comportamiento resumido | Umbrales |
| -------- | --------------- | ------------------------ | -------- |
| `eq-novatos` | Líder + 2 novatos | 2–5 fallos/puzzle difícil; pide pista si `blockedTime` > 3 min; orden puede ser «malo» (p. ej. candado antes que sonido) | Abandono simulado si sin progreso 8 min |
| `eq-lectores` | Lector + lógico + explorador | Lee diario; prueba hipótesis verbalizadas; 1–2 fallos | Penalizar si victoria **solo** con N3 literal |
| `eq-sensorial` | Familia 3–5 | Prioriza sound/voice/visual/camera; evita bloques de texto | Penalizar si sensorial no enseñado |
| `eq-experto` | Dupla ER | ≤1 fallo/puzzle; evita pistas hasta atasco 5 min | Dificultad «baja» si victoria < 35 min en 45 min evento |
| `eq-ansioso-tiempo` | 2 jugadores | Mira reloj cada escena; salta secundarios | Ritmo: ¿compresión GM ayuda sin spoilear? |
| `eq-organizador` | 1 organizador | Crea evento, panel, **no** juega salvo verificación join | Multiequipo §8 |

### 1.3 Reglas de simulación honrada

1. Documentar **cada intento** con valor probado y razón (aunque sea errónea).
2. Solo usar información **visible** (UI, GM lines, diario, audio reproducido).
3. `talk_to_character` / voz: texto fallback permitido si UI lo ofrece.
4. Si el perfil **no** sabría usar una mecánica, no llamar `complete_interaction` hasta que la UI o N1 lo sugiera (excepción: permisos mock cámara/geo como en E2E).
5. Registrar cuando el **GameMaster** (línea `escape-gm-line`) cambia la estrategia del equipo.

---

## 2. Modalidades de partida real

| `executionMode` | Descripción | ¿Cuenta para veredicto de dificultad? |
| ------------- | ----------- | ------------------------------------- |
| `real_session_exploratory` | Descubrimiento completo hasta victoria, derrota o abandono simulado | **Sí** |
| `real_session_partial` | Juega acto 1 o 50 % tiempo; abandono simulado documentado | **Sí** (dificultad/atasco) |
| `real_session_assisted` | Exploratorio pero permite **una** pista interna del agente («revisa YAML solo tras fin de corrida» para contrastar) — **no** durante la partida | Solo coherencia post-hoc |
| `real_session_multiteam` | ≥2 contextos, mismo `joinCode`, sesiones independientes | **Sí** (+ multiequipo) |

Replay y auditoría estática se ejecutan en paralelo (fases B/C de [prompt-playtest-grupo.md](./prompt-playtest-grupo.md)) **sin mezclar** veredicto.

---

## 3. Tipos de juego a instanciar (campaña)

Cada fila = **una o más partidas reales** nuevas (nuevo `sessionId` / evento).

### 3.1 Catálogo (modo clásico)

| `gameKind` | `roomId` | Partidas mínimas | Perfiles recomendados |
| ---------- | -------- | ---------------- | --------------------- |
| `catalog` | `pilot` | 3 (novatos, expertos, orden malo) | eq-novatos, eq-experto, eq-lectores |
| `catalog` | `lighthouse` | 2 | eq-sensorial, eq-mixto |
| `catalog` | `interactive-lab` | 1 | eq-sensorial (+ camera mock) |
| `catalog` | `geo-lab` | 1 | eq-novatos (+ geo mock) |

### 3.2 Eventos generados (partida custom real)

Crear evento por **UI lobby** o `POST /api/events` (tras leer `events-routes.ts`).

| `adventureType` | Payload ejemplo | Partidas mínimas |
| --------------- | --------------- | ---------------- |
| `birthday` | Fixture `SARA_EVENT` o variante facts | 2 (novatos + experto) |
| `celebration` | facts distintos, mismo subject | 1 |
| `mystery` | facts costeros + nickname | 1 |
| `team` | 4 equipos, duración 45 | 1 multiteam |

**Regla:** dos eventos con mismos `facts` pero distinto `adventureType` **no** cuentan como dos personalizaciones; deben diferir datos jugables o tipo.

### 3.3 Futuro (documentar `N/D` si no hay flujo E2E)

| `gameKind` | Notas |
| ---------- | ----- |
| `spatial_scan` | Scanner → propuesta → sesión |
| `spatial_site` | Multi-habitación + mapa |

---

## 4. Parámetros ER evaluados (veredicto por partida)

Para **cada partida real**, emitir `verdict` por parámetro: `pass` | `adjust` | `fail` | `inconclusive` + nota 0–10 + `evidence[]`.

| Parámetro | ID | Pregunta decisiva | Pass (resumen) |
| --------- | -- | ----------------- | -------------- |
| Dificultad | `difficulty` | ¿El perfil adecuado se atasca sin humillación ni aburrimiento? | Curva acorde a `erExperience`; fail-forward/GM recupera |
| Coherencia narrativa | `story` | ¿Historia + puzzles + escenas cuentan lo mismo? | Sin contradicciones; pistas cruzadas consumibles |
| Coherencia mecánica | `mechanics` | ¿Cada puzzle da algo que otro usa? | Alineado con `audit-coherence`; sin soft-lock en exploratorio |
| Jugabilidad / diversión | `playability` | ¿Queréis seguir jugando? | `perceivedProgress` ≥ 7; no pantallas muertas > 2 min |
| Ritmo y tensión | `pacing` | ¿Reloj y GM empujan sin apresurar mal? | Tiempo a primer acierto < 25 % del límite |
| Pistas (diseño) | `hints` | ¿N1→N2→N3 enseñan sin spoiler prematuro? | Victoria posible sin N3; N3 no obligatorio en catálogo |
| Sensorial | `sensory` | ¿Sound/voice/camera/visual/geo enseñan y enlazan? | Pasos `listen/view/capture/speak` claros |
| UX / fluidez | `ux` | ¿La app pelea con el grupo? | Sin flash error crónico; permisos explicados |
| GameMaster | `gamemaster` | ¿El director ayuda al ritmo del perfil? | Líneas antes del 1er acierto; adaptación tras fallos (catálogo/evento) |
| Cierre | `closure` | ¿Victoria paga la premisa del lobby? | Payoff nombra historia; no solo «código OK» |
| Multiequipo | `multiteam` | Solo eventos | Sesiones aisladas; leaderboard coherente |
| Personalización | `personalization` | Solo generados | Facts → puzzles/hints, no solo título |

**Veredicto global partida:** `ship` | `iterate` | `block` derivado de:

- `block` si cualquier P0 (`mechanics` fail, soft-lock, multiteam fail)
- `iterate` si ≥2 parámetros `adjust` o `difficulty` fail para `eq-novatos` en juego P0
- `ship` si todos P0 pass y nota media ≥ 7 en parámetros evaluados

Cruzar con `pnpm experience-eval:score`: si objetivo ≥ 9 pero `eq-novatos` `playability` fail, explicar desvío (métricas no capturan orden de puzzles).

---

## 5. Métricas instrumentadas (mismas que playtest v2 + extensión)

Obligatorio en cada run real:

- `blockedTime`, `repeatedAttempts`, `confusionEvents`, `hintDependency`, `perceivedProgress`, `simulatedAbandonment`, `recoveryTime`
- `wrongAttempts`, `hintsUsed[]`, `gmLineCount`, `timeToFirstSolveSec`, `timeToWinSec` | null
- `playerModel` (§1.1) y `teamId`
- `sessionId`, `roomId` | `eventJoinCode`, `adventureType`

`measurementKind`: `instrumented` | `estimated` | `N/D` por campo.

---

## 6. Procedimiento de ejecución (agente / computerUse)

### Fase 0 — Preparación

```bash
pnpm install && pnpm build
pnpm validate-rooms && pnpm audit-coherence
```

API + web en 8787 / 5173 (ver [prompt-playwright-e2e.md](./prompt-playwright-e2e.md)). `stubMediaRoutes` + mocks cámara/geo según sala.

### Fase 1 — Instanciar partida real

**Catálogo:** lobby → catálogo → sala → clásico → esperar puzzles.

**Evento:** crear evento → anotar `joinCode` → join equipo con nombre → comprobar `escape-gm-line`.

### Fase 2 — Jugar según `playerModel`

- Cronometrar hitos (escena, puzzle resuelto, pista pedida).
- En fallos: registrar feedback UI + línea GM si aparece.
- Pedir pista solo si el perfil lo permite y umbrales §1.2 lo dictan.
- Victoria, `data-status="lost"`, o **abandono simulado** con puzzle/escena actual.

### Fase 3 — Veredicto y contraste

1. Rellenar parámetros §4 con evidencias (`data-testid`, citas narrativa, timestamps).
2. Opcional post-partida: `pnpm audit-coherence` para ese `roomId` o tipo evento — **sin** usar answers para justificar exploratorio.
3. Append JSON §10.

### Fase 4 — Informe

Redactar `docs/partidas-reales-informe.md` con tabla:

| Partida | Tipo | Equipo | Veredicto global | Dificultad | Coherencia | Jugabilidad | … |

Y sección **«Decisiones de producto»**: lista accionable (contenido vs GM vs UX), máx. 15 ítems.

---

## 7. Matriz de campaña mínima (DoD documento)

Sin cerrar campaña hasta:

| Eje | Meta |
| --- | ---- |
| Partidas reales | ≥ **10** runs `real_session_*` con `sessionId` distintos |
| Catálogo | pilot ≥3, lighthouse ≥2, lab + geo ≥1 cada una |
| Eventos | 4 `adventureType` con ≥1 partida real **o** `inconclusive` + bloqueo UI documentado |
| Perfiles | Los 6 `teamId` §1.2 usados al menos una vez |
| Abandono simulado | ≥2 runs con `simulatedAbandonment` justificado |
| Contraste replay | Misma sala: 1 exploratorio + 1 replay; comparar tiempos **sin** igualar veredicto |

---

## 8. Multiequipo (eventos reales)

Checklist (ampliar [prompt-playtest-grupo.md](./prompt-playtest-grupo.md) §9):

1. Dos joins, `sessionId` distintos.
2. Progreso en equipo A no altera B (mismo puzzle, estados distintos tras acción).
3. Victoria A no fuerza B (`GET /api/events/:code/leaderboard`).
4. Opcional: tercer equipo se une tarde — documentar `N/D` si no probado.

---

## 9. GameMaster en partida real

Evaluar en la **misma sesión**:

| Señal | Pass |
| ----- | ---- |
| ≥2 líneas GM antes del primer puzzle resuelto | Sí en catálogo/evento P0 |
| Tras 2 fallos | Empuje coherente (catálogo/evento post-#94/#96) |
| `TEAM_STUCK` / pista extra | Perfil novato recupera sin spoiler literal en GM |
| `llmStatus` | `baseline` \| `llm_active` — no penalizar baseline si política producto es fallback |

Prohibido en informe exploratorio: citar solución no descubierta en partida.

---

## 10. Esquema JSON (`e2e/.cache/partidas-reales-runs.json`)

```json
{
  "schemaVersion": 1,
  "campaignId": "uuid",
  "runs": [
    {
      "runId": "uuid",
      "timestamp": "ISO-8601",
      "gitSha": "string",
      "executionMode": "real_session_exploratory",
      "gameKind": "catalog",
      "roomId": "pilot",
      "adventureType": null,
      "eventJoinCode": null,
      "sessionId": "string",
      "teamId": "eq-novatos",
      "playerModel": {
        "erExperience": 1,
        "readingPatience": 2,
        "logicPuzzles": 1,
        "sensoryLiteracy": 2,
        "digitalLiteracy": 2,
        "localeEs": 5
      },
      "won": true,
      "abandonedAt": null,
      "timeToWinSec": 2400,
      "metrics": {
        "blockedTime": 320,
        "hintDependency": 0.4,
        "gmLineCount": 5
      },
      "verdicts": {
        "difficulty": { "status": "pass", "score": 7.5, "evidence": ["…"] },
        "story": { "status": "pass", "score": 8 },
        "playability": { "status": "adjust", "score": 6 }
      },
      "globalVerdict": "iterate",
      "evidence": [
        { "t": "12:01", "kind": "attempt", "puzzleId": "lockbox", "detail": "0000" }
      ],
      "llmStatus": "no_configurado"
    }
  ]
}
```

Sincronización opcional: duplicar resumen en `playtest-grupo-runs.json` con `schemaVersion: 2` y `executionMode: exploratory` **solo** si la corrida cumple §0.

---

## 11. Prompt listo para agente browser (computerUse)

Copiar al lanzar subagente:

> Eres un equipo de escape room con el perfil `{teamId}` y conocimientos `{playerModel}`. Juega una **partida real** en `{roomId o evento}` sin guion de solución: solo UI, diario y GM. Registra intentos, fallos, pistas pedidas y tiempo bloqueado. Objetivo: victoria o abandono simulado según umbrales del perfil. Al terminar, rellena veredictos §4 de [prompt-partidas-reales-jugadores.md](./prompt-partidas-reales-jugadores.md) con evidencias. No uses fixtures `*-win.ts`.

---

## 12. Relación con CI

- `pnpm test:e2e` sigue siendo **regresión replay**.
- Este prompt **no** añade specs obligatorios a CI; opcional futuro: `partidas-reales-smoke.spec.ts` que solo verifique que se puede **abrir** sesión y resolver **un** puzzle con path no hardcodeado (sin victoria completa).

**North star:** las partidas reales son la fuente de verdad para **dificultad, coherencia y jugabilidad**; `experience-eval` y `audit-coherence` son contrapesos objetivos que deben **concordar o explicar tensiones** en el informe.