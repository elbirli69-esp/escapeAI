# PROMPT — Playtest en grupo: catálogo, eventos custom y auditoría narrativa (escapeAI)

**Rol:** director de playtests de escape room + agente que simula **varios equipos** con perfiles distintos, juega partidas de catálogo y **eventos personalizados**, y entrega un informe sobre **dificultad**, **coherencia de la historia**, **calidad de pistas** y **huecos** entre lo que el sistema genera y lo que debería generar.  
**Objetivo:** complementar la batería E2E objetiva (`experience-eval`) con una capa de **QA lúdico y de contenido** repetible, sin sustituir un grupo humano real en producción.  
**No objetivo:** juzgar la calidad literaria del LLM del GameMaster si no hay proveedor configurado (medir **fallback GM** como baseline y marcar «sin LLM» en el informe).

**Complementa:**  
[prompt-e2e-experiencia-jugable.md](./prompt-e2e-experiencia-jugable.md) (notas 0–10 objetivas) ·  
[prompt-coherencia-partidas.md](./prompt-coherencia-partidas.md) (`pnpm audit-coherence`) ·  
[prompt-playwright-e2e.md](./prompt-playwright-e2e.md) (regresión funcional) ·  
[prompt-custom-events.md](./prompt-custom-events.md) (eventos) ·  
[prompt-entretenimiento-er.md](./prompt-entretenimiento-er.md) (diseño ER)

**Salida esperada (no commitear por defecto):** `docs/playtest-grupo-informe.md` + anexo JSON `e2e/.cache/playtest-grupo-runs.json`.

---

## North star (preguntas que debe responder el informe)

Tras ejecutar este prompt, un product owner debe poder contestar:

1. **Dificultad:** ¿Cada sala / tipo de evento tiene una curva razonable (primer acierto en X min, nº de pistas antes de frustración)?
2. **Historias:** ¿La promesa del lobby (tagline, tipo de aventura, facts del organizador) se cumple en escenas, beats y epílogo?
3. **Pistas:** ¿Las pistas nivel 1–2 orientan sin contradecir `answer` ni regalar la solución? ¿Faltan pistas donde hay soft-lock?
4. **Generación:** ¿Qué partes del YAML/evento son **deterministas** vs **derivadas** de `subject` / `facts` / escaneo espacial — y dónde hay **placeholder** o copy genérico?
5. **Ausencias:** ¿Qué deberíamos generar y hoy no (beats por puzzle, pistas por fallo, variante diaria, texto de victoria personalizado, pista GM, assets, geo, personajes)?

---

## Simulación de grupos (personas jugadoras)

Cada **corrida** asocia un **equipo** con nombre, tamaño y **perfil de habilidad**. El agente debe ejecutar al menos **una corrida por perfil** en cada ámbito P0, y documentar desviaciones si un perfil no puede terminar victoria.

| ID equipo | Tamaño | Perfil | Comportamiento simulado |
| --------- | ------ | ------ | ------------------------ |
| `eq-novatos` | 3–4 | Principiante | 2–3 respuestas incorrectas por puzzle difícil; pide pista manual si existe UI; lee poco el diario |
| `eq-mixto` | 4 | Mixto | 1 fallo intencional; explora pestañas de puzzles; habla con personaje si está en escena |
| `eq-experto` | 2 | Veterano ER | Victoria rápida; comprueba puzzles opcionales; sin pistas |
| `eq-familia` | 5 | Familia / niño | Sensoriales (sonido/visual) primero; tolerancia baja a texto largo (>120 chars en móvil) |
| `eq-org` | 1 | Organizador | Crea evento en lobby, abre panel, **no** juega hasta que otro equipo entra (spec `organizer-panel`) |

**Regla:** en Playwright, cada equipo = **contexto de navegador limpio** (`clearGameStorage`, `joinCode` distinto). No reutilizar `localStorage` entre equipos salvo test explícito de resume.

---

## Matriz de escenarios (qué debe jugarse)

### A. Catálogo (YAML fijo)

| Sala | Spec victoria / parcial | Playtest además de e2e |
| ---- | ----------------------- | ------------------------ |
| `pilot` | `catalog-pilot-win.spec.ts` | Comprobar orden sensorial + pistas candado |
| `lighthouse` | `catalog-lighthouse-win.spec.ts` | Cadena sound → visual → voice |
| `interactive-lab` | `interactive-lab-partial.spec.ts` | Si no hay victoria E2E en matriz, marcar `partialWin` y bloquear recomendación “referencia” |
| `geo-lab` | `geo-lab-mocked.spec.ts` | Permisos + mock geo documentados |

### B. Eventos custom (generados)

Para cada `adventureType` en `birthday` | `celebration` | `mystery` | `team`, generar **al menos 2 payloads distintos**:

1. **Fixture estable (regresión)** — alineado con `SARA_EVENT` / tests existentes (`events-mvp`, `events-full-win`).
2. **Variante custom** — datos nuevos pero realistas (nombre, nickname, 2–4 `facts`, `teamCount` 2–6, `durationMin` 30–60).

Plantilla de payload (organizador → API crear evento):

```json
{
  "adventureType": "mystery",
  "teamCount": 4,
  "durationMin": 45,
  "subject": {
    "name": "María Costa",
    "nickname": "María",
    "age": 34
  },
  "facts": [
    "Su año clave es 1992",
    "Le encanta el faro de Cabo Mayor",
    "El equipo de trabajo se llama Gaviotas"
  ],
  "eventTitle": "El archivo de María"
}
```

**Comprobaciones obligatorias por evento custom:**

- `entry_lock` (u homólogo) debe ser **derivable** de `facts` + pista sonido sin contradictorio (`audit-coherence` regla prefijo sonido → candado).
- Victoria alcanzable con fixture Playwright o script documentado (si no existe spec, registrar **gap E2E** en informe).
- Comparar **título lobby** vs **cuerpo victoria** (¿menciona subject / facts?).

### C. Modos fuera de E2E completo (auditoría + muestreo)

| Modo | Acción mínima |
| ---- | --------------- |
| Espacial (scanner 1 habitación) | `pnpm test` + `generate-spatial`; 1 arquetipo por corrida mental o script futuro |
| Site multi-room | Win-path documentado en coherencia; marcar si no hay spec |
| Variante diaria catálogo | 2 fechas distintas `applyCatalogDailyVariant` — ¿cambia dificultad sin romper victoria en tests? |

---

## Dimensiones de valoración (cualitativa 0–10 + evidencia)

Cada corrida puntúa **por sala/evento** y por **dimensión**. Usar la misma escala verbal que [prompt-e2e-experiencia-jugable.md](./prompt-e2e-experiencia-jugable.md) (9–10 referencia … 0–2 roto).

| Dimensión | ID | Qué registrar |
| --------- | -- | ------------- |
| Dificultad percibida | `difficulty` | Tiempo hasta primer acierto; nº fallos antes victoria; necesidad de pista nivel 2–3 |
| Coherencia narrativa | `story` | tagline ↔ escena 1 ↔ beats ↔ victoria; facts del evento en copy |
| Pistas y fair play | `hints` | Cada hint usado: ¿miente? ¿spoiler? ¿inútil?; gaps si puzzle sin hint y bloquea |
| Variedad mecánica | `mechanics` | Tipos de puzzle en el recorrido; repeticiones entre tipos de evento |
| UX de grupo | `group_ux` | Multisession (equipos distintos), GM visible, reload, permisos sensoriales |
| Generación / huecos | `coverage` | Lista explícita **generado** vs **estático** vs **faltante** (ver tabla abajo) |

**Cruzar con scoring objetivo:** donde exista perfil en `e2e/experience-matrix.json`, citar nota de `pnpm experience-eval:score` y explicar **desvío** si el juicio cualitativo de grupo discorda (ej. nota alta en variedad pero historia plana).

---

## Inventario: qué generamos hoy vs qué deberíamos

En cada corrida, el agente rellena esta checklist (copiar filas al informe):

| Artefacto | ¿Generado / derivado? | Fuente | ¿Gap si falta? |
| --------- | --------------------- | ------ | -------------- |
| Escenas y grafo | Evento: sí; catálogo: YAML | `generate-adventure.ts`, rooms YAML | Eventos muy parecidos entre tipos |
| Candado / respuestas numéricas | Derivado de facts | generador + tests | Facts ambiguos → imposible sin LLM |
| Beats narrativos | Parcial | YAML / `buildGeneratedBeats` | Beats por `puzzle_solved` custom |
| Pistas escalonadas | YAML + generador | hints[] | Pistas tras fallo automático |
| Portadas / escenas imagen | Plantillas + Pexels fallback | `ADVENTURE_VISUAL`, `/media` | Offline sin `/media` coherente |
| Líneas GameMaster | Trigger rules; LLM opcional | `apps/api` gamemaster | Sin API key: solo fallback |
| Respuestas personaje | Plantilla + `authorizedKnowledge` | YAML character | No personalizado por evento |
| Victoria / epílogo | Texto fijo o plantilla | generador / YAML | Poco eco de facts en eventos custom |
| Variante diaria | Solo catálogo pilot/lighthouse | `daily-variant` | No en eventos |
| Geo / location puzzles | geo-lab, site exterior | YAML | Catálogo sin geo en pilot |
| Leaderboard / organizador | Sí (eventos) | Web + API | No afecta narrativa |

**Campo libre obligatorio:** «**Deberíamos generar y no generamos:**» (3–7 bullets accionables).

---

## Procedimiento autónomo (agente cloud)

Ejecutar en orden; no sustituir `pnpm test:e2e` verde en `main`.

### Fase 0 — Baseline técnica

```bash
pnpm install
pnpm build
pnpm validate-rooms
pnpm audit-coherence
pnpm test
CI=1 pnpm test:e2e
pnpm experience-eval:score   # opcional pero recomendado
```

Si hay errores de coherencia en salas P0, **priorizar corrección YAML** antes de emitir notas de historia.

### Fase 1 — Playtest catálogo (por equipo simulado)

Para cada sala P0 y perfiles `eq-novatos`, `eq-mixto`, `eq-experto`:

1. Ejecutar spec de victoria o fixture (`e2e/fixtures/*-win.ts`).
2. Registrar: tiempos, fallos simulados, pistas usadas (si UI `escape-hint` o equivalente existe).
3. Anotar en JSON: `roomId`, `teamId`, `won`, `hintsUsed[]`, `wrongAttempts`, `notes`.

### Fase 2 — Eventos custom (multiequipo)

1. **Organizador:** `createEventFromLobby` (fixture `events.ts`) con payload custom.
2. **Equipo A y B:** `joinEventAsTeam` con nombres distintos; verificar sesiones separadas (`events-mvp`).
3. **Victoria:** `playSaraEventToWin` solo como plantilla de pasos; para variantes custom, documentar recorrido puzzle a puzzle o añadir spec nuevo `events-custom-{id}.spec.ts`.
4. Clasificar coherencia con `pnpm audit-coherence` tras cambiar generador (si el agente tocó código).

### Fase 3 — Síntesis de dificultad

Construir tabla **curva de dificultad** (no es nota global):

| Juego | Primer puzzle (s) | Puzzles en win path | Fallos recomendados | Pista mínima necesaria |
| ----- | ----------------- | ------------------- | ------------------- | ---------------------- |
| pilot | … | … | 0–2 | nivel 1 suficiente sí/no |
| event mystery (custom) | … | … | … | … |

Umbrales orientativos para **warning** (no bloquean CI):

- Primer acierto &gt; 8 min en novatos → dificultad alta.
- Victoria experta &lt; 3 min en sala con `timeLimitSec` largo → posible puzzle regalado.
- Más de 2 hints nivel 3 usados en misma sala → pistas mal graduadas.

### Fase 4 — Informe y backlog

Escribir `docs/playtest-grupo-informe.md` con estructura obligatoria (abajo). Proponer **máximo 10 ítems** en backlog (YAML, generador, nuevo spec E2E, matriz `experience-matrix.json`).

Opcional: volcar corrida estructurada a `e2e/.cache/playtest-grupo-runs.json` para futuros `experience-eval` v2.

---

## Formato de informe (`docs/playtest-grupo-informe.md`)

```markdown
# Informe playtest en grupo — {fecha ISO}

## Resumen ejecutivo
- Corridas: N | Victorias: V | Eventos custom: K
- Top 3 fortalezas | Top 3 riesgos
- Nota global experience-eval (si se ejecutó): X/10

## Por modo

### Catálogo: {roomId} — equipo {teamId}
- Dificultad: …/10 — evidencia
- Historia: …/10 — …
- Pistas: …/10 — listado hints probados
- Generado vs gap: bullets

### Evento custom: {adventureType} — «{eventTitle}»
- Payload (resumen facts)
- Coherencia facts → puzzles (ok/warning/error)
- Comparación con tipo `birthday` / `mystery` (¿se sienten distintos?)

## Matriz dificultad (tabla)

## Huecos de generación (priorizado)
1. …
2. …

## Recomendaciones E2E nuevos
- Spec propuesto: `e2e/specs/...` — alcance — perfil matriz `id`

## Anexo
- Comandos ejecutados
- SHA commit / rama
```

---

## Evolución hacia automatización (backlog de producto)

Para acercar este prompt a CI sin perder el juicio de grupo:

| Paso | Entrega |
| ---- | ------- |
| 1 | Parámetro `playtestMatrix.json` con payloads custom y `teamProfiles` |
| 2 | Spec `playtest-custom-events.spec.ts` serial que recorre N payloads |
| 3 | Hook post-partida: volcar diario + GM lines + hints a `.cache/` |
| 4 | Linter narrativo: facts mencionados en victoria / beats (`audit-coherence` extensión) |
| 5 | Perfil matriz `playtest-group` con peso bajo en nota global pero gate en release candidates |

---

## Criterios de aceptación del prompt (definition of done)

El agente puede dar por **cerrada** una ejecución cuando:

1. Al menos **4 salas/catálogo** y **4 adventureTypes** con **2 payloads** cada uno están documentados (victoria o motivo de no victoria).
2. Informe incluye tabla de dificultad y sección **«deberíamos generar»**.
3. `audit-coherence` y `test:e2e` ejecutados; fallos enlazados a ítems del informe.
4. No se commitea informe salvo que el humano pida publicarlo (igual que otros `docs/*-informe.md` generados).

---

## Referencias rápidas

- Matriz experiencia: `e2e/experience-matrix.json`
- Fixtures victoria: `e2e/fixtures/pilot-win.ts`, `lighthouse-win.ts`, `event-win-path.ts`, …
- Crear evento E2E: `e2e/fixtures/events.ts`
- Auditoría: `pnpm audit-coherence` · `pnpm audit-fisico`