# Plan de adopción — técnicas ER del catálogo ERL online gratis

**Origen:** [estudio ERL](./estudio-erl-online-gratis.md) (45 juegos indexados desde [Escape Room Lover](https://www.escaperoomlover.com/es/escape-room-online-gratis)).  
**Objetivo:** convertir patrones repetidos en el catálogo en **entregables incrementales** en escapeAI (motor → contenido → API/PWA → GM → auditoría), sin imitar enlaces rotos ni IP de terceros.  
**Complementa:** [prompt-entretenimiento-er.md](./prompt-entretenimiento-er.md) (P5 híbrido, P6 ideas ERL).

---

## 1. Resumen ejecutivo

Del catálogo ERL emergen **10 patrones mecánicos** que se repiten en decenas de títulos. escapeAI **ya cubre** ~6 de ellos de forma superior (eventos N equipos, scanner, GM adaptativo, clue ledger, site espacial, híbrido P5 en progreso). Los **cuatro huecos** con mayor retorno jugable son:

| # | Patrón ERL | Gap escapeAI | Iniciativa |
|---|------------|--------------|------------|
| A | Cierre **whodunit** (sospechosos + deducción) | Finale = código, no acusación | **P6-A** |
| B | **Información asimétrica** por jugador/dispositivo | Mismo `PublicState` por equipo | **P6-B** |
| C | **Hub navegable** estilo edificio / mansión | Site fuerte; generados aún lineales | **P6-E** (hub en mystery) |
| D | **Demo lobby 15–20 min** sin fricción | Falta plantilla corta pública | **P6-C** |

El resto se adopta **reutilizando** capacidades actuales (grafo `when`, `grantClue`, cultural `visual`, saga por escena bloqueada, prep impresión) con tareas de contenido y copy, no nuevos subsistemas.

**Orden recomendado de ejecución:** terminar **P5-Fases A/C/D/E** (organizador + UI 2 pasos) → **P6-A** → **P6-B** → **P6-C** → **P6-D** → **P6-E** + pilot oficina.

---

## 2. Matriz técnica: patrón → estado → archivos

Leyenda: ✅ hecho · 🟡 parcial · ⬜ por hacer.

| Patrón ERL | Referencia juegos | Estado escapeAI | Dónde tocar |
|------------|-------------------|-----------------|-------------|
| Hub navegable | Firulais, Manfredi, Prado | 🟡 site YAML; generado 3 actos lineales | `generate-adventure.ts`, `spatial-site`, beats |
| Grafo de dependencias | La oficina, Tolok | ✅ `when`, `all_of`, `has_clue` | `room-definition.ts`, `session.ts`, generador |
| Llave URL/código | Casi todos | ✅ `joinCode`, QR, puzzles `code` | lobby, `camera:qr_scan` |
| Ayuda vídeo externo | Varios | ✅ sustituido por hints + GM | `gamemaster/fallbacks.ts` |
| OSINT / redes | Algunos antiguos | ✅ **facts** del wizard, geo quiz | `generate-adventure.ts`, flavor |
| Imprimir + QR + calculadora | Legado Escapista, Cura | 🟡 P5 acto 2; falta PDF organizador | `audit-fisico.ts`, P5-C |
| Whodunit final | Firulais, Dulce crimen, Covid | ⬜ | **P6-A** — ver §4.1 |
| Pista distinta por jugador | Cura, Suero Javinski | ⬜ (teamVariable es comunitario, no rol) | **P6-B** — ver §4.2 |
| Saga parte 1/2 | Misión rescate | 🟡 mismo evento; sin acto 2 desbloqueable | **P6-D** — ver §4.4 |
| Ficha dificultad/jugadores | Fichas ERL | 🟡 `difficulty`, `timeLimitSec` | lobby copy, **P6-C** |

**Ventaja defendible (no copiar de ERL, reforzar en marketing y demos):** personalización por semilla, ranking multiequipo, sala escaneada → puzzles, GM director, sensores validados en servidor, auditoría `pnpm audit-fisico`.

---

## 3. Fases del plan (macro)

### Fase 0 — Baseline (ya en `main` / rama P5)

**Entregable:** clue ledger, beats, GM P4, híbrido acto 2 (`takeRequiresPuzzleSolved`).

**Verificación:** `pnpm test` en `escape-engine` + `escape-content`; `pnpm audit-coherence`; playtest pilot 8 min hasta primer candado.

---

### Fase 1 — Cerrar P5 (técnicas ERL #6 físico-digital)

**Inspiración:** Legado del Escapista, Michelón (kit mínimo), Firulais (QR en casa).

| ID | Tarea | Componente | Criterio de aceptación |
|----|-------|------------|------------------------|
| P5-A | Bloques «En la sala» / «En el móvil» en `interactionHints` | `generate-adventure.ts`, `authoring-rooms.md` | Cada híbrido generado ≥1 par de bloques; test snapshot |
| P5-C | Ficha «Qué preparar» (pantalla/PDF) desde `prepChecklist` | API organizer, web EventOrganizer | Lista objetos + QR derivado de `joinCode`; sin spoil de `answer` |
| P5-D | UI estación 2 pasos | PWA `PuzzleInstructionCard` | Paso móvil deshabilitado hasta `take_item` / cámara sala cumplida |
| P5-E | `audit-fisico` ≥1 cadena por tipo aventura | `audit-fisico.ts` | CI job opcional verde en 4 `adventureType` |
| P5-B3 | Acto 3: cartel + `ocr_hint` opcional | generador + organizador modo *sala ligera* | Misma cadena grantClue que acto 2 |

**Dependencias:** ninguna bloqueante en motor (contrato ya existe).

**Riesgo:** organizadores sin impresora → flag *solo móvil* debe degradar sin romper win condition.

---

### Fase 2 — P6-A Whodunit en `mystery` generado

**Inspiración:** Firulais, Justicia criminal, Investigando Covid, Un dulce crimen.

#### 4.1 Diseño de juego (1 página, fijo)

1. **Actos 1–2:** puzzles existentes; cada resolución añade al ledger una pista **sobre un sospechoso** (ubicación, objeto, coartada rota), no la solución literal.
2. **Acto 3 — sala de acusación:** puzzle nuevo `accusation` (o `code` con UX dedicada) con:
   - 4 sospechosos generados desde `facts` (nombres/apodos del wizard).
   - 3 atributos binarios por sospechoso (ej. «estaba en cocina», «sin guantes», «dejó mensaje») alimentados por `clueId` previos.
3. **Respuesta:** selección `(suspectId, motiveClueId)` o código derivado `iniciales_culpable + dígito_verificación` donde el dígito viene de `has_clue`.
4. **Victoria:** epílogo nombra al culpable y **red herring** (falso sospechoso con 2/3 pistas verdaderas).

#### 4.1 Implementación técnica

| Capa | Cambio | Detalle |
|------|--------|---------|
| **Motor** | Tipo puzzle opcional `deduction` o extensión `code` | Campos: `suspects[]`, `traits[]`, `correctSuspectId`, `when` exige `all_of` clues |
| **Motor** | Win / unlock finale | `when: { type: has_clue, clueId: accusation_ready }` emitido al resolver penúltimo puzzle |
| **Contenido** | `generate-adventure.ts` ramita `mystery` | 5ª escena opcional `accusation` o finale con UI whodunit; plantilla sospechosos desde `facts.people` |
| **API** | `PublicState` | Exponer `suspects` (sin answers); clues ya en `clues[]` |
| **PWA** | `WhodunitPanel` | Tabla sospechosos × rasgos; casillas se tachan al tener `has_clue`; submit acusación |
| **GM** | fallback `mystery` | Al entrar a acto acusación: 1 beat «Reúne las pruebas antes de señalar» |
| **Tests** | `generate-adventure.test.ts` + `clues-beats.test.ts` | Fixture: resolver 3 puzzles → clues → acusación correcta gana |
| **Auditoría** | `audit-coherence` | Mystery generado debe tener ≥3 `grantClue` con prefijo `suspect_` |

**No hacer en v1:** matriz 5×5 editable, LLM que inventa culpable (culpable = función determinista de semilla + facts).

**Duración estimada de desarrollo:** 1 PR motor (si `deduction`), 1 PR generador+PWA, 1 PR GM+auditoría.

---

### Fase 3 — P6-B Roles asimétricos (mismo equipo, vistas distintas)

**Inspiración:** La cura del virus 1–2, Suero Javinski, Sadness Epidemic.

#### 4.2 Diseño

- **2–4 slots** por sesión (`playerRole: researcher | field | analyst | courier`) asignados en join por rotación o enlace `?role=`.
- Cada puzzle o hint lleva `visibleToRoles?: RoleId[]` (default: todos).
- **Cooperación obligatoria:** puzzle A solo ve rol 1; B solo rol 2; C requiere `has_clue` de A y B (comunicación verbal/videollamada).
- Distinto de `teamVariable` (progreso **comunitario entre equipos** del evento).

#### 4.2 Implementación técnica

| Capa | Cambio |
|------|--------|
| **shared** | `RoleId`, `joinRequest.role?`, validación en API |
| **escape-engine** | Filtrar `interactionHints`, `hints` y descripciones de puzzle en snapshot según rol; **servidor** no envía `answer` de puzzles ocultos |
| **escape-engine** | Condición opcional `when: { type: has_clue, clueId, anyRole: true }` |
| **API** | Persistir `session.playerRole` en join |
| **PWA** | Banner «Tu rol: …» + aviso «Comparte con tu equipo lo que veas» |
| **Generador** | Modo opt-in `asymmetricRoles: true` en eventos team/mystery; 6 mini-puzzles, 2 por rol |
| **Anti-cheat** | Un dispositivo no puede cambiar de rol sin re-join; organizer ve solo agregados |

**v1 acotado:** 2 roles, 1 evento template, sin reasignación mid-game.

---

### Fase 4 — P6-C Demo lobby gratis (Michelón / Toda una vida)

| Elemento | Especificación |
|----------|------------------|
| Duración | `timeLimitSec: 1200`, 2 escenas, 3 puzzles |
| Jugadores | 1–2, sin wizard largo (defaults) |
| Híbrido | 0–1 estación opcional (solo QR join) |
| Descubrimiento | Entrada en lobby home + flag `isPublicDemo: true` |
| Conversión | CTA post-victoria a evento personalizado |

**Archivos:** `lobby-home-modes.ts`, nueva entrada catálogo YAML `demo-michelon.yaml` o generador `buildDemoRoom()`, analytics evento anónimo.

**Métrica:** playtest < 20 min, epílogo emocional (birthday/celebration tone).

---

### Fase 5 — P6-D Saga dos actos

**Inspiración:** Misión retorno / rescate.

- Misma `eventId`; acto 2 escena `finale_b` con `when: puzzle_solved(final_act1)`.
- Organizador puede **cerrar acto 1** manualmente (panel) para forzar pausa narrativa.
- Leaderboard congela o segmenta por acto (config).

**Motor:** ya soporta escenas y exits condicionales; trabajo en **generador** + copy + organizer toggle.

---

### Fase 6 — P6-E Hub investigación (mystery no lineal)

**Inspiración:** Firulais, Prado, La oficina.

- En `mystery` generado: escena hub `investigation` con 3–4 sub-rutas (cocina, archivo, jardín) como puzzles en paralelo **acotado** (máx 2 activos, regla anti-patrones).
- GM cite `spatialSiteSummary` / visitas en copy.

**Contenido primero;** motor sin cambios si se usa `scenes.*.exits`.

---

### Fase 7 — Catálogo pilot ampliado «oficina»

**Inspiración:** La oficina (ERL).

- Nuevo YAML o extensión `pilot` con sospechosos corporativos, documentos `visual`, finale P6-A reutilizable.
- Personaje GM con `authorizedKnowledge` por escena.

---

## 4. Técnicas de adopción «solo contenido» (sin PR de motor)

Estas técnicas ERL se absorben con **YAML, generador y GM**, siguiendo [principios de diseño ER](./prompt-entretenimiento-er.md):

| Técnica | Juegos ERL | Acción |
|---------|------------|--------|
| Stakes por acto | Visión, Cabaña | 2º beat en YAML + `TIME_WARNING` |
| Cultural / museo | Prado, Renacimiento, Egipto | `pexelsQuery` temático + facts como «obras» |
| Horror pacing | Melodía maldita | `sound` + compresión GM |
| Humor team | Carlinos, Emergencia gatuna | copy en `toneForType` team |
| Romance / celebration | Romeo, Sant Jordi | plantilla seasonal + `voice` |
| Sci-fi stakes | Planeta Pi, A.I. Takeover | flavor GM team + leaderboard |
| Geo tres regiones | Sadness Epidemic | 3 puzzles `location` en site |
| Mystery largo | Cris, Desaparición | más escenas en mystery arc (generador) |

**Checklist por PR de contenido:** hilo de pistas (`grantClue` → siguiente `interactionHints`), ≤2 puzzles paralelos en finale, victoria con epílogo.

---

## 5. Lo que **no** adoptamos (v1)

| ERL / idea | Motivo |
|------------|--------|
| Hogwarts y fan IP | Legal + fuera de marca |
| Escape book ramificado (Cambio de piel) | Coste motor; roadmap largo plazo |
| Rubik minijuego | Fuera del motor ER |
| OSINT Instagram / webs reales | Privacidad + mantenimiento |
| Replicar 25 enlaces muertos | Sin valor; solo patrones |
| Vídeo YouTube obligatorio | Rompe PWA; hints locales |

---

## 6. Métricas globales de adopción

Al cerrar **Fase 2 + 3** (P6-A + P6-B), el producto debería cumplir:

| Métrica | Umbral |
|---------|--------|
| Mystery generado con whodunit | Playtest: jugador identifica culpable usando solo Notas |
| Roles asimétricos | 2 dispositivos: ninguno puede ganar solo |
| Híbrido P5 | `pnpm audit-fisico` ≥1 cadena/acto en generados |
| Tiempo primer «aha» | < 8 min pilot / demo |
| Coherencia | `pnpm audit-coherence` verde |
| Diferenciación vs ERL | Demo grabado: scan + multiequipo en un mismo evento |

---

## 7. Desglose de PRs sugeridos (orden)

```
PR-1  docs: plan adopción ERL (este documento)
PR-2  P5-A/C: hints sala-móvil + prepChecklist organizer
PR-3  P5-D/E: UI 2 pasos + audit-fisico ampliado
PR-4  P6-A motor: deduction / accusation + tests
PR-5  P6-A producto: generador mystery + WhodunitPanel
PR-6  P6-B: playerRole + filtro servidor + generador 2 roles
PR-7  P6-C: demo lobby YAML + home entry
PR-8  P6-D: acto 2 desbloqueable + organizer pause
PR-9  P6-E + pilot oficina: hub + YAML catálogo
```

Cada PR declara métricas de la tabla en [prompt-entretenimiento-er.md](./prompt-entretenimiento-er.md).

---

## 8. Seguimiento

| Artefacto | Responsable |
|-----------|-------------|
| Inventario ERL | `estudio-erl-online-gratis.md` (actualizar si cambia la URL) |
| Roadmap checkboxes | `prompt-entretenimiento-er.md` P5/P6 |
| Reglas audit | `prompt-coherencia-partidas.md` al añadir whodunit/roles |
| Playtests | walkthrough 2 min por PR de UI |

**Próximo paso recomendado:** ejecutar **PR-2** (cerrar organizador P5) y en paralelo especificar esquema `deduction` en `room-definition.ts` para **PR-4**.