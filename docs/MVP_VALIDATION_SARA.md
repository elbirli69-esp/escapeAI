# Matriz de validación MVP — Caso «Cumpleaños de Sara»

Escenario de referencia para implementación y QA. Aventura: **«El caso de los seis sospechosos»** (contenido manual).  
**Participantes:** Marcos (host), Sara + 4 amigos presenciales, **Leo remoto** (6º jugador).

Leyenda estado implementación (**oct 2026**): 🔴 no implementado · 🟡 especificado · 🟢 solo en docs/fixture

---

## Tabla principal

| Momento | Acción usuario | Funcionalidad técnica | Resultado esperado | Criterio de aceptación | Estado |
|---------|----------------|----------------------|--------------------|-------------------------|--------|
| **Preparación** | Marcos inicia sesión en Creator/Host | Auth organizador, `POST sessions`, `game_version` seed | Sala creada, `invite_code` | Host ve dashboard y enlace/QR de invitación | 🟡 |
| Preparación | Descarga dossier PDF | Storage signed URL, asset `asset_dossier` | PDF imprimible A4 legible | Impresión sin cortes; textos P2/P3 usables en mesa | 🟡 |
| Preparación | Lee guía preparación física | Host doc / settings_json | Lista QR + dónde colocarlo | QR apunta a join o puzzle one-shot documentado | 🟡 |
| Preparación | Comparte enlace a Leo (remoto) | Mismo `invite_code` o join URL | Leo puede unirse antes de empezar | 6º slot reservado; token distinto | 🟡 |
| **Llegada** | Invitados escanean QR / abren enlace | `POST join`, guest token | Jugador en lobby `players` row | Sin cuenta; nombre visible en host | 🟡 |
| Llegada | Marcos ve quién está | Host view API | Lista 6 slots, online/offline | 6 nombres antes de start | 🟡 |
| Llegada | Host no inicia hasta listo | State machine `ready` → `running` | Timer no corre en lobby | `HOST_START` rechazado si reglas host no cumplidas (config) | 🟡 |
| **Inicio** | Host inicia partida | `HOST_START`, distribución clues/roles | Status `running`, timer | Cada móvil recibe rol + pista privada distinta | 🟡 |
| Inicio | Sara abre su móvil | `PlayerViewDTO` | Ve solo su pista privada | Leak test: Sara no ve pista de Leo | 🟡 |
| **Escena crimen** | Grupo resuelve P1 observación | `SUBMIT_PUZZLE_ANSWER`, validación exact | `puzzle.solved` event | Un solo solve; todos ven progreso público | 🟡 |
| **Mesa** | Pasan PDF, debaten | N/A (físico) + pistas share | `SHARE_CLUE` opcional | Pista compartida visible en views autorizados | 🟡 |
| **QR pasillo** | Un jugador escanea QR | Puzzle P2 presentation `qr` | Pista ático en móvil | QR no expone solución; acota sesión si one-shot | 🟡 |
| **Coop timeline** | Investigadores proponen; 4/6 confirman | `COOP_PUZZLE_CONTRIBUTE`, P3 rule | P3 solved cuando ≥4 distintos | Estado consistente en 6 clientes | 🟡 |
| **Cifrado** | Criptógrafo P4 | Role gate + validation | Solo rol autorizado submit | Otros reciben 422 o UI locked | 🟡 |
| **Caja fuerte** | Dos jugadores aportan fragmentos | P5 combination + minDistinctPlayers | Solve tras 2+ contribuciones | No resolvable en solitario | 🟡 |
| **Timed 30'** | Sistema dispara llamada | Timed event / timer check | Flag `phone_tip`, narración | Todos reciben señal + refresh view | 🟡 |
| **Interrogatorio** | Interrogador P6, grupo escucha | NPC script/GM + keyword hits | Flag `victor_contradiction` | ~10 min mecánicas; no bypass P4/P5 | 🟡 |
| **Remoto** | Leo share clue / coop / submit | Misma Command API + resume | Mismos eventos seq | Leo no es read-only; sync ≤3s percibido | 🟡 |
| **Remoto** | Leo pierde WiFi, vuelve | `POST resume`, idempotency | Estado completo recuperado | Misma pista privada; seq avanzado | 🟡 |
| **Final** | Voto acusación P7 | `NARRATIVE_CHOICE`, flags | `final_correct` / wrong / timeout | Epílogo distinto si contradicción | 🟡 |
| **Cierre** | Pantalla final compartida | Public narrative + session `completed` | Host y players ven desenlace | No reabrir puzzles tras completed | 🟡 |

---

## Escenarios críticos (detalle)

### Multiplayer

| # | Escenario | Criterio |
|---|-----------|----------|
| M1 | 6 joins simultáneos | 6 tokens únicos; sin duplicar slot |
| M2 | Roles 3×2 | Asignación equilibrada investigador/criptógrafo/interrogador |
| M3 | Aisleamiento | Harness: 6 views sin substring de clues ajenas |
| M4 | Updates públicos | Puzzle solved visible en los 6 clientes tras señal+resume |

### Tiempo real

| # | Escenario | Criterio |
|---|-----------|----------|
| T1 | Acción jugador A → B ve cambio | Tras commit, B obtiene view con mismo `seq` |
| T2 | Dos submits concurrentes | Un evento solved; sin doble unlock |
| T3 | Refresh página Sara | Resume restaura rol, clues, timer |
| T4 | Host pause | Timer pausado en todos los views |

### Juego remoto (Leo)

| # | Escenario | Criterio |
|---|-----------|----------|
| R1 | Join remoto pre-start | Aparece en lobby host |
| R2 | Pista privada Leo | Solo Leo en view |
| R3 | Coop P5 | Leo cuenta como contribuidor distinto |
| R4 | P3 votación | Leo incluido en conteo 4/6 |
| R5 | PDF | Leo abre dossier en móvil/tablet |

### Progresión

| # | Escenario | Criterio |
|---|-----------|----------|
| P1 | P6 bloqueado sin P4+P5 | Motor rechaza o UI locked |
| P2 | Replay event log | Estado idéntico post-restart servidor |
| P3 | Final wrong | Flag sin `victor_contradiction` → final alternativo |

### Físico ↔ digital

| # | Escenario | Criterio |
|---|-----------|----------|
| F1 | PDF ↔ P2/P3 | Códigos en PDF coherentes con validación motor |
| F2 | QR ↔ sesión | Scan lleva a flujo documentado (join o pista) |
| F3 | Prep host | Checklist completable en &lt;15 min |

---

## Fuera de MVP (no validar en Sara v1)

- Subida fotos/anécdotas de Sara → trama generada.
- Referencias automáticas a la vida de Sara en textos.
- Dossier generado por IA en el acto.
- GM LLM obligatorio (opcional script).

---

## Trazabilidad tests

| Suite | Cubre |
|-------|--------|
| Fase 1 unit | P1–P7 validation, roles, projections leak |
| Fase 2 integration | M*, T*, R* parcial |
| Fase 2 harness 6 clients | M3, M4, T2 |
| Fase 3 playtest Sara script | F*, R*, criterio comercial |

---

## Definition of Done — Caso Sara jugable

- [ ] Playtest 6 personas (≥1 remoto) completa en ≤75 min.
- [ ] Matriz: todas las filas **Momento** con criterio verificado en entorno staging.
- [ ] Ningún leak de solución en DevTools (checklist Fase 3 MVP_SCOPE).
- [ ] Host confirma prep física viable con guía publicada.
