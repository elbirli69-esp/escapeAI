# PROMPT — Entretenimiento ER (narrativa, ritmo y arquitectura)

**Rol:** diseñador principal de escape rooms + arquitecto de producto escapeAI.  
**Objetivo:** elevar **diversión, tensión y sensación de “sala de verdad”** en todos los modos de partida, aceptando cambios en motor, API, contenido y PWA cuando el diseño lo exija.  
**No objetivo:** romper determinismo del servidor, filtrar soluciones al cliente ni subir fotos/audio a servidores sin política de privacidad explícita.

**Complementa:** [prompt-coherencia-partidas.md](./prompt-coherencia-partidas.md) (¿es consistente?), [prompt-sensory-escape-room-v3.md](./prompt-sensory-escape-room-v3.md) (sensorial hilado), [product-generic-experiences.md](./product-generic-experiences.md).

---

## North star (qué significa “entretenido” aquí)

Un jugador debería poder decir, al terminar:

1. **“Entendí la historia”** — no solo resolví códigos sueltos.
2. **“Cada prueba me dio algo”** — cifra, letra, orden o lugar que **otra cerradura nombra en el texto**.
3. **“Hubo un momento wow”** — revelación, giro, o prueba física memorable (cámara, voz, sala real).
4. **“El ritmo me empujó”** — tensión suave al inicio, compresión hacia el final, sin pantallas muertas.
5. **(Opcional social)** **“Competimos o cooperamos con sentido”** — el modo evento/organizador lo refleja.

Si un cambio solo mejora métricas técnicas pero no estos cinco puntos, es secundario.

---

## Diagnóstico (entretenimiento hoy, por modo)

| Modo | Fortalezas ER | Gaps de diversión |
| ---- | ------------- | ----------------- |
| **Catálogo** (`pilot`, `lighthouse`) | Arco lineal, objetos, personaje en pilot | Pocas variaciones en rejuego; GM aún no es director de giros |
| **Eventos generados** | Personalización social, sensorial, leaderboard | Misma estructura 3 escenas × 4 tipos; misterio casi solo copy+costa; finale con muchos puzzles paralelos |
| **Espacial 1 hab.** | Innovación físico-digital | Premisa corta; bridge/finale a veces repetitivos |
| **Site multi-habitación** | Exploración real, mapa | Geo y puzzles interiores poco narrados como “misión”; GM sin mapa visitado |
| **interactive-lab** | Demostración OSS | Rompe inmersión; no es producto de ocio |
| **GameMasterAI** | Triggers, personajes, ritmo | Flavor sin **beat sheet**; espacial/site fuera de contexto LLM |

Usar `pnpm audit-coherence` para **coherencia mecánica** antes de tocar entretenimiento; este prompt cubre **drama, ritmo y arquitectura lúdica**.

---

## Principios de diseño ER (obligatorios en propuestas)

1. **Revelación escalonada** — el jugador aprende *quién*, *qué falta* y *qué pasa si fallo el tiempo* antes del acto 3.
2. **Clue ledger** — cada puzzle resuelto escribe en `session` (o en YAML) una **pista explícita consumible** listada en el prompt del siguiente puzzle (`interactionHints` + narrativa).
3. **Un foco por escena en móvil** — un puzzle “principal” activo; secundarios opcionales con copy que diga “no bloquea la salida”.
4. **Fail-forward suave** — tras N fallos, degradar pista en cliente/motor sin regalar solución (ya hay hints; falta **progreso dramático**, p. ej. desbloquear audio extra).
5. **Cierre con payoff** — victoria nombra el nombre central, el lugar o el objeto escaneado; no terminar en “código correcto” sin epílogo.
6. **Modo-aware** — cumpleaños ≠ team building ≠ misterio en **arco**, no solo en `toneForType` de 3 párrafos.

---

## Capa 1 — Contenido (sin motor)

### Catálogo YAML

- Añadir **2º beat** por escena (reacción al resolver puzzle anterior en `description` dinámico vía GM o párrafo YAML condicional futuro).
- **lighthouse:** vincular marea → almacén → faro en pistas 1–2 sin cifras.
- **pilot:** que el conserje **reaccione** a `lockbox` resuelto (GM `CHARACTER_TURN` con `authorizedKnowledge` ampliado por escena).
- Variantes **hard/relaxed** = mismo grafo, `timeLimitSec` + `maxHints` distintos (catálogo duplicado ligero o flag en `ROOM_CATALOG`).

### `generate-adventure.ts`

| Cambio | Entretenimiento |
| ------ | --------------- |
| **Arcos distintos por `adventureType`** | celebration: 4 actos “fiesta”; birthday: 3 actos íntimos; mystery: 5 escenas investigación; team: checkpoints con “sprint” |
| **Facts → clue ledger** | Tras cada puzzle, inyectar en `narrative` del motor una línea “Anota: …” derivada de `facts` (template, no LLM) |
| **Finale lineal** | Ordenar puzzles finale: `visual` → `final_code` → `voice_seal`; salida bloqueada por `final_code` solo (voice como sello opcional con copy) |
| **Mystery real** | Plantilla con **falso culpable** en flavor + código que no sea solo iniciales del nombre (p. ej. mezcla año en facts + apodo) |
| **`occasionLabel` libre** | Texto en convocatoria y en victoria (ver product doc) |

### Espacial / site

- Cada propuesta incluye **premisa en una frase + stakes** (“Si no sincronizáis reloj y libro, la puerta del trastero no abre”).
- Texto de pasaje (`bridge`) referencia objeto **confirmado** del scan (`objectsUsed` ya existe; usarlo en `prompt`).
- **Prep checklist** visible al organizador como “guion de sala” (no spoiler de respuestas).

---

## Capa 2 — Arquitectura (motor y contratos)

> Cualquier cambio aquí exige tests en `@escapeai/escape-engine` y actualizar `PublicState` solo si la UI lo necesita.

### A. Clue ledger en motor (recomendado P1)

```yaml
# Ejemplo futuro en puzzle
onSolve:
  grantClue:
    id: prefix_digits
    text: "El prefijo del mensaje era {{value}}."
    consumableBy: [entry_lock, final_code]
```

**Implementación sugerida:**

- `SessionRecord.clues: Record<clueId, string>`
- `submit_answer` / `puzzle_solved` emite clue según reglas en `RoomPuzzle` o reglas generadas.
- `GmViewContext` y pistas nivel 1 pueden referenciar clues ya obtenidos (sin solución literal).
- **Generador de aventuras** rellena `grantClue` automáticamente para sound→lock.

### B. Dependencias entre puzzles (P1)

Hoy muchas salidas son `puzzle_solved` de un solo id. Añadir condición compuesta opcional:

```yaml
when:
  type: all_of
  conditions:
    - { type: puzzle_solved, puzzleId: a }
    - { type: has_clue, clueId: prefix_digits }
```

Reduce puzzles “sueltos” en finale sin bloquear catálogo actual (`all_of` opt-in).

### C. Beat sheet por sala (P2)

Contrato en `RoomDefinition`:

```ts
beats?: Array<{
  id: string;
  after: { trigger: GameEventType; puzzleId?: string };
  flavor: string; // texto fijo o plantilla
  optionalGmTrigger?: GmTrigger;
}>;
```

El API, tras `applyAction`, compara eventos con `beats` y encola intervención GM o empuja a `narrative[]`. **El motor no depende del LLM**; los beats son datos.

### D. Progreso dramático en eventos multijugador (P2–P3)

| Opción | Uso | Coste |
| ------ | --- | ----- |
| **Solo leaderboard** (hoy) | Carrera individual | Bajo |
| **Event beat flags** en KV | “50 % equipos resolvieron candado” → mensaje en panel organizador | Medio |
| **Estado compartido opcional** (`teamVariable`) | Un candado comunitario + puzzles individuales | Alto; requiere diseño anti-cheat |

Empezar por **flags de hito en event store** sin sincronizar inventario compartido.

### E. Narrativa espacial en GM (P1)

Ampliar `GmViewContext` con:

- `spatialSiteMap` visitado (`visitedOrder <= current`)
- `currentRoomLabel`, `nextSuggestedRoom`
- Regla GM: al `SCENE_ENTERED` en site, **1 frase** que sitúe la habitación real

Ver gap en [gamemaster-ai-gm0.md](./gamemaster-ai-gm0.md).

### F. Flavor LLM acotado en generación (P2)

Pipeline post-`generateAdventureRoom`:

1. Sala determinista (source of truth).
2. LLM **solo** reescribe `description` / `mood` / `tagline` en escenas.
3. Validador: sin regex de `answer`, sin dígitos de 4 cifras, longitud máxima.
4. Snapshot en evento (no regenerar en join).

Arquitectura: `apps/api/src/flavor/` + tests de validación.

---

## Capa 3 — Experiencia cliente (PWA)

| Mejora | ER impact |
| ------ | --------- |
| **Reveal al resolver** | Animación breve + sonido local al `puzzle_solved` (Howler ya en stack) |
| **Clue notebook UI** | Panel “Notas” alimentado por `PublicState.clues` (si Capa 2A) |
| **Mapa site diegético** | `SpatialSitePlayMap`: habitación actual resaltada + “siguiente según guion” |
| **Modo foco** | Ocultar tabs de otros puzzles no activos en escena |
| **Victoria** | Pantalla epílogo: tiempo, rango en evento, frase de cierre por `adventureType` |
| **TTS del GM** | Ya GM-4; usar en bienvenida y `TIME_WARNING` para tensión |

---

## Capa 4 — Ritmo y dificultad (GM-5 + motor)

- **Curva por tiempo:** minutos 0–20 exploración; 20–80 % puzzles core; último 15 % compresión (aviso `TIME_WARNING` + pista 2 automática **una vez** por política).
- **`TEAM_STUCK`:** no solo banner; ofrecer **pista ambiental** (SFX + texto) distinta del hint YAML.
- **Dificultad generada:** `difficulty` en propuestas espaciales ya existe; mapear a `maxHints` y `timeLimitSec` en `buildSpatialRoom` / `buildSpatialSiteRoom`.

---

## Roadmap sugerido (prioridad)

### P0 — Quick wins (solo contenido + copy + GM estático)

- [x] Finale evento generado: orden y copy de puzzles opcionales.
- [x] Arcos de texto diferenciados mystery vs team en `toneForType` + títulos de escena distintos (no solo párrafos).
- [x] Payoff de victoria en API fallback GM (`GAME_WON` nombra subject + lugar del evento).
- [x] Site: prompts de pasaje citan etiquetas de `links` y objetos escaneados.
- [x] Ejecutar `pnpm audit-coherence` en CI (job opcional).

### P1 — Motor + GM context

- [x] `grantClue` / `has_clue` (clue ledger en motor + panel «Notas» en PWA).
- [x] `GmViewContext.spatialSiteSummary` (visitas y siguiente tramo del recinto).
- [x] Beat sheet mínimo en `pilot` y sala generada (beats en YAML / generador).

### P2 — Producto social y flavor

- [x] Hitos en panel organizador (“3 equipos en escena 2”).
- [x] Flavor LLM validado post-generación.
- [x] Notebook en PWA.

### P3 — Cooperación y rejuego

- [ ] `teamVariable` opcional por evento.
- [ ] Variantes catálogo / daily seed espacial.

---

## Métricas de aceptación (entretenimiento)

Cualquier PR bajo este prompt debería declarar cómo valida:

| Métrica | Cómo medir |
| ------- | ----------- |
| **Hilo de pistas** | Test e2e o `audit-coherence` extendido: cada puzzle del acto 2 menciona clue del acto 1 en `interactionHints` o `grantClue` |
| **Tiempo hasta primer “aha”** | Playtest: < 8 min en pilot/generado con datos de ejemplo |
| **Finale sin saturación** | ≤ 2 puzzles activos simultáneos en última escena (generado) |
| **Victoria con epílogo** | `GAME_WON` o pantalla final incluye subject/site name |
| **Rejuego sonoro** | Misma semilla evento = misma sala; distinta semilla = patrón sonoro distinto (ya); añadir variación en **texto** de beats |

---

## Procedimiento para agente / desarrollo

1. Leer modo afectado (tabla diagnóstico) y elegir **una palanca** (P0–P3).
2. Si toca motor: esquema en `room-definition.ts` + tests `applyAction` + migración gradual en YAML.
3. Si toca generador: fixture fijo en `generate-adventure.test.ts` + playtest mental del clue ledger.
4. Si toca GM: solo datos en `GmViewContext`; nunca mutar sesión desde LLM.
5. Manual: grabar **2 min** de partida (lobby → victoria) o walkthrough según [walkthrough-artifacts skill] si hay UI.
6. No regresar coherencia: `pnpm audit-coherence` verde.

---

## Anti-patrones (rechazar en review)

- Spoilers de `answer` en descripciones de escena en cliente.
- Más de 4 puzzles en una escena hub sin guion.
- LLM que inventa mecánicas no en motor.
- Cooperación en tiempo real sin especificación de conflicto inventario.
- “Más puzzles” en lugar de **mejor encadenamiento**.

---

## Entregables esperados al ejecutar este prompt

1. **Documento de diseño corto** (1 página) por modo: acto 1–3, beats, clues.
2. **Diff mínimo** en código o YAML con tests.
3. **Entrada en** `docs/prompt-coherencia-partidas.md` si aparecen nuevas reglas auditables.
4. **(Opcional)** Nuevo caso e2e Playwright: “jugador llega a epílogo con nombre visible”.

---

## Referencias

- [architecture.md](./architecture.md)
- [gamemaster-ai-gm5.md](./gamemaster-ai-gm5.md) — ritmo
- [prompt-ux-ui-temas-visuales.md](./prompt-ux-ui-temas-visuales.md)
- [prompt-custom-events.md](./prompt-custom-events.md)
- [scanner-phase-4d-ar-3d.md](./scanner-phase-4d-ar-3d.md) — mapa 2D site
