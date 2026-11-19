# PROMPT — Plan de diálogo ER: director, pistas y personajes (escapeAI)

**Rol:** diseñador senior de escape rooms digitales + arquitecto de producto GM. Elaboras un **plan de implementación** alineado con práctica real de salas físicas: pistas graduadas, director que acompaña sin sustituir el puzzle, personajes in-world con reglas claras — **sin** chat omnipotente ni pistas falsas del director por defecto.

**Objetivo:** producir un documento accionable que un equipo (humano o agente) pueda ejecutar en fases sin rehacer GameMasterAI desde cero.

**No objetivo:** implementar código en esta pasada; redactar solo el plan, trade-offs y criterios de aceptación.

**Complementa (lectura obligatoria):**

| Documento | Aporta |
| --------- | ------ |
| [gamemaster-ai-summary.md](./gamemaster-ai-summary.md) | Estado GM-0…GM-5 |
| [gamemaster-ai-gm0.md](./gamemaster-ai-gm0.md) | Límites: GM solo lee y narra |
| [gamemaster-ai-gm2.md](./gamemaster-ai-gm2.md) | Pistas + `TEAM_STUCK` |
| [gamemaster-ai-gm3.md](./gamemaster-ai-gm3.md) | `talk_to_character`, `CHARACTER_TURN` |
| [gamemaster-ai-gm5.md](./gamemaster-ai-gm5.md) | Pacing adaptativo |
| [prompt-entretenimiento-er.md](./prompt-entretenimiento-er.md) | Ritmo, clue ledger, fair play |
| [prompt-partidas-reales-jugadores.md](./prompt-partidas-reales-jugadores.md) | Veredicto `gamemaster`, `hints`, perfiles |
| [prompt-playtest-grupo.md](./prompt-playtest-grupo.md) | Cómo validar cambios GM |

**Salida obligatoria (sí commitear el plan):**

- `docs/gm-dialogo-er-plan.md` — plan maestro (este prompt define su esquema §9)

**Salidas opcionales:**

- `docs/gm-dialogo-er-backlog.md` — user stories por fase
- Actualización de `docs/gamemaster-ai-gm6.md` (fase siguiente) si procede

---

## 0. Principios ER (verdad de producto — no negociar sin decisión explícita)

Documentar en el plan como **axiomas** y marcar cualquier desviación como `EXCEPCIÓN_DE_PRODUCTO`:

| # | Principio | Implicación en escapeAI |
| - | ----------- | ------------------------ |
| P1 | **Tres voces distintas** | (a) diseño de sala/YAML, (b) **Director** (GameMaster), (c) **personajes** de escena — nunca mezclar UI sin etiquetar |
| P2 | **Fair play** | El director **no** entrega solución ni dígitos; las pistas oficiales son `Pedir pista` (N1→N3 YAML) |
| P3 | **Pistas falsas** | **Fuera** del director por defecto; si hay engaño, es **contenido** (póster, diario) o **NPC** bajo modo «teatro», no `CHARACTER_TURN` del conserje sin marco |
| P4 | **Acompañamiento vs. resolución** | El director empuja ritmo, atasco y moral; los personajes dan color y rumores acotados |
| P5 | **Predecibilidad para novatos** | Cualquier ayuda nueva debe ser **contable** (plantillas, límites/día, cooldown) — coherente con playtests `eq-novatos` |
| P6 | **Baseline sin LLM** | Todo trigger nuevo debe tener **fallback estático**; LLM es `llm_optional`, nunca único camino |

---

## 1. Auditoría del estado actual (obligatoria antes del plan)

El agente **lee código** y completa una tabla en el plan (no suponer).

### 1.1 Canales existentes

| Canal | Archivos clave | ¿Qué puede el jugador hoy? | Gap vs P1–P6 |
| ----- | -------------- | -------------------------- | ------------ |
| Pista puzzle | `session.ts`, `InteractivePuzzle.tsx`, `hints.ts` | Pedir pista por reto | … |
| Director proactivo | `service.ts`, `triggers.ts`, `fallbacks.ts` | Líneas/banners sin chat | … |
| Personaje | `talk_to_character`, `CharacterChat`, `characters.ts` | Chat solo si hay NPC en escena | … |
| Eventos generados | `generate-adventure.ts`, GM-3 «fuera de alcance» | ¿Personajes? ¿GM copy? | … |

### 1.2 Comandos de verificación

```bash
pnpm --filter @escapeai/escape-engine test -- character-talk
pnpm --filter @escapeai/api test -- gamemaster
rg -l "talk_to_character|CHARACTER_TURN|request_hint" apps packages
```

### 1.3 Evidencia playtest

Citar hallazgos de [partidas-reales-informe](./partidas-reales-informe.md) / `playtest-grupo-informe.md`: `hints adjust`, N3, dependencia de pistas, `gamemaster baseline`.

---

## 2. Visión objetivo (1 párrafo + diagrama)

El plan debe incluir un **diagrama** (mermaid o ascii) de flujo jugador:

```text
Jugador atascado
    ├─► Pedir pista (motor YAML)     ← columna vertebral
    ├─► Director (FAQ / nudge)       ← nuevo: acotado, sin solución
    └─► Hablar con NPC (si escena)   ← ampliar catálogo/eventos
```

Definir **qué NO entra en v1** del plan (chat libre al director, GM mintiendo, auto-hint sin acción del jugador).

---

## 3. Bloques de diseño (el plan debe decidir cada uno)

### 3.1 Director — «Preguntar al director» (recomendado vs chat libre)

| Decisión | Opciones | Criterio ER |
| -------- | -------- | ----------- |
| Superficie UI | Plantillas fijas vs input libre | Plantillas primero (novatos, fair play) |
| Trigger GM | Nuevo `DIRECTOR_FAQ` vs extensión `PACE_NUDGE` | Trazabilidad en `triggers.ts` |
| Respuestas | Solo estático vs LLM con guardrails | Paridad sin `OPENAI_*` |
| Anti-spoiler | Lista forbidden + puzzles.answer | Reusar `validation.ts` |
| Límite uso | N por partida / cooldown | Como `GM_CHARACTER_COOLDOWN_MS` |

**Plantillas mínimas propuestas** (el plan debe priorizar, reordenar o ampliar):

1. «¿Vamos bien de tiempo?»
2. «¿Este puzzle es importante ahora?»
3. «¿Qué deberíamos mirar en la escena?»
4. «Estamos atascados, ¿qué hacemos sin spoiler?»
5. «¿Tiene sentido pedir pista ya?»

Cada plantilla → intención, `spoilerLevel` máximo, enlace a `Pedir pista` en copy.

### 3.2 Personajes

| Decisión | Contenido |
| -------- | --------- |
| Cobertura | Pilot (hecho), lighthouse, ¿eventos generados? |
| Relación con puzzles sensoriales | `concierge_hail` vs `CharacterChat` — evitar duplicidad confusa |
| TTS | GM-4 `useGmSpeech` — ¿solo personaje? |
| Personalidad engañosa | Solo si YAML declara `misleadingKnowledge[]` + disclaimer UI |

### 3.3 Pistas graduadas (contenido, no arquitectura nueva)

Plan de **contenido** alineado con playtests:

- Revisión N3 catálogo (post PR #98 pilot lockbox).
- Política N3 global: «nunca literal de `answer`» salvo modo `facilitator`.
- Coherencia con `audit-coherence` y clue ledger.

### 3.4 Modos / eventos

| Modo | Director | Personajes | Pistas falsas |
| ---- | -------- | ---------- | ------------- |
| Catálogo clásico | FAQ + triggers actuales | Por YAML | No |
| Evento birthday/mystery/team | Copy por `adventureType` existente | Fase: personajes generados | No |
| Modo futuro `teatro` (opcional) | Inerte | NPC puede mentir | Solo con opt-in lobby |

### 3.5 LLM y coste

- Cuándo bajar a `static` (`resolveAdaptivePolicy` GM-5).
- Presupuesto: `GM_MAX_CHARACTER_LLM` + tope análogo para director FAQ.
- Prompt system: reutilizar reglas de `provider.ts` (sin dígitos, solo JSON context).

---

## 4. Fases de implementación (el plan debe numerar y acotar)

Cada fase: **entregable**, **archivos a tocar**, **riesgo**, **no hacer**.

| Fase | Nombre sugerido | Entregable | Dependencia |
| ---- | --------------- | ---------- | ----------- |
| F0 | Inventario + copy | Tabla §1 completa | — |
| F1 | Contenido pistas | YAML catálogo P0 + checklist N3 | audit-coherence |
| F2 | Director FAQ (estático) | UI plantillas + fallbacks + tests API | GM-2 |
| F3 | Personajes eventos | Fichas mínimas en `generate-adventure` | GM-3 |
| F4 | Director FAQ (LLM opcional) | Provider + validación | F2 |
| F5 | Playtest cerrado | Ampliar `partidas-reales-runner` criterios GM | prompt partidas reales |

El plan debe **rechazar** chat libre al director en F1–F3 salvo decisión `EXCEPCIÓN_DE_PRODUCTO` documentada.

---

## 5. UX / accesibilidad

Checklist en el plan:

- Diferenciar visualmente **Director** vs **Personaje** (icono, color, `data-testid`).
- Respuestas cortas (≤2 frases motor; ≤3 personaje — ya en provider).
- Mobile: plantillas en chips, no textarea largo en v1.
- `prefers-reduced-motion` / sensory: sin obligar voz para entender ayuda.
- i18n: español primario; no hardcodear en React sin pasar por copy GM.

---

## 6. Métricas y aceptación

### 6.1 Criterios objetivos

| Métrica | Umbral post-F2/F5 |
| ------- | ----------------- |
| `gmLinesBeforeFirstSolve` | ≥2 (mantener catálogo P0) |
| Peticiones «dime el código» bloqueadas | 100 % en exploratorio (validación) |
| `hintDependency` novatos pilot | No empeorar vs baseline JSON |
| E2E | Nuevo spec `director-faq.spec.ts` verde sin LLM |
| `experience-eval` global | Sin caída >0,3 en cap GM |

### 6.2 Criterios cualitativos (partidas reales)

Por perfil `eq-novatos` / `eq-experto`, veredicto `gamemaster` y `hints`:

- `pass` si el director orienta sin spoiler en ≥4/5 plantillas.
- `fail` si cualquier FAQ revela dígito o palabra de `answer`.

---

## 7. Riesgos y mitigaciones (tabla obligatoria)

Ejemplos que el plan debe cubrir o extender:

| Riesgo | Mitigación |
| ------ | ---------- |
| Confundir director con personaje | UI + `kind` en intervención |
| LLM filtra solución | `validateIntervention` + sin `answer` en context |
| Sobre-ayuda experto | FAQ con cooldown; pacing `critical` solo banner |
| Eventos sin personajes | F3 explícito; no prometer chat en generados hasta entregado |
| Soporte «la app me mintió» | Sin pistas falsas director; modo teatro opt-in |

---

## 8. Procedimiento para el agente redactor

1. Leer docs §«Complementa» + auditoría §1.
2. Redactar `docs/gm-dialogo-er-plan.md` siguiendo esquema §9.
3. Incluir **decisiones abiertas** (máx. 8) con recomendación ER y alternativa descartada.
4. Incluir **roadmap** 6–12 ítems ordenados (sin estimaciones en semanas).
5. No implementar; si detecta bug P0 (p. ej. spoiler N3 residual), listar en plan como quick win opcional Fuera de fase.
6. Commitear solo `docs/gm-dialogo-er-plan.md` (+ backlog opcional).

---

## 9. Esquema de `docs/gm-dialogo-er-plan.md`

```markdown
# Plan — Diálogo ER: director, pistas y personajes

## Resumen ejecutivo
## Axiomas ER (P1–P6)
## Estado actual (tabla §1.1)
## Visión y fuera de alcance v1
## Diseño por canal (pista / director / personaje)
## Fases F0–F5 con Definition of Done
## UX y copy
## LLM / fallback / env
## Métricas y playtest
## Riesgos
## Decisiones abiertas
## Referencias código
```

---

## 10. Prompt listo para agente implementador (fase posterior)

> Tras aprobación humana del plan, ejecutar **solo la fase indicada** del `gm-dialogo-er-plan.md`. Mantener fallbacks, tests en `@escapeai/api` gamemaster y un caso E2E por feature. Validar con `partidas-reales-runner` o spec dedicado. No activar chat libre al director salvo ticket explícito.

---

## 11. Relación con conversación de producto (contexto)

Este prompt materializa la dirección acordada:

- **Sí:** pistas graduadas + director breve + NPC donde haya lore.
- **No por defecto:** GameMaster conversacional omnisciente con pistas falsas adaptativas.
- **Opcional futuro:** modo teatro y engaño en NPC/contenido, no en el director.

El plan debe hacer explícito cómo un stakeholder que pide «chat con GM y pistas falsas» puede satisfacerse **sin romper** fair play (modo, personaje, contenido estático).