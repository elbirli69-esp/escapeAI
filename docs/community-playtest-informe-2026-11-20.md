# EscapeAI — Playtest autónomo comunidad (informe)

**Fecha:** 2026-11-20  
**Ámbito:** repo `escapeAI` @ `main` post GM matriz A–L (informe congelado en el tiempo de la corrida).  
**Motor de prueba:** E2E Playwright local, Vitest API/engine, script estrés in-memory ([`e2e/scripts/community-stress-smoke.ts`](../e2e/scripts/community-stress-smoke.ts)).

**Documentos relacionados:** [playtest-grupo-informe.md](./playtest-grupo-informe.md) (snapshot CI), [beta-cerrada-guia.md](./beta-cerrada-guia.md) (onboarding organizador).

## A. Resumen ejecutivo

| Métrica | Valor |
| -------- | ----- |
| Usuarios virtuales modelados | **30** (10 perfiles × 3 grupos cada uno) |
| Grupos escenarios (A–J) | **10** tipos; **8 ejecutados** en código, **2 parciales** |
| Salas/eventos creados (estrés) | **10** eventos, **30** sesiones equipo |
| Partidas iniciadas (estrés + E2E) | **30+** |
| Partidas completadas (E2E replay) | pilot win, lighthouse, events-full (suite CI) |
| Escenarios inventariados | **68** |
| PASS | **41** |
| PARTIAL | **14** |
| FAIL | **3** |
| BLOCKED | **7** |
| NOT IMPLEMENTED | **3** |

**Veredicto global:** listo para **pruebas internas** y **beta cerrada** (competición por equipos, 1 móvil/equipo). **No** listo para prometer “sala multijugador cooperativa N jugadores en la misma partida” ni “anfitrión con permisos/autenticación” sin rediseño.

---

## B. Modelo real vs prompt

| Expectativa del prompt | Implementación |
| ---------------------- | -------------- |
| Hasta 10 jugadores misma sala | **NOT IMPLEMENTED** — máx. **5 equipos**, cada uno con **sessionId** propia |
| Anfitrión inicia partida | **NOT IMPLEMENTED** — al unirse, el equipo **arranca** la sesión |
| Chat entre jugadores | **NOT IMPLEMENTED** |
| Tiempo real | **NOT IMPLEMENTED** — poll 15s (juego) / 8s (organizer) |
| Sala clásica + código | Catálogo **sin código**; eventos **código 6 hex** |
| Aventura personalizada | **PASS** — lobby crear evento + `generateAdventureRoom` |
| Aislamiento entre equipos | **PASS** — tests integración + estrés 30 sesiones |

---

## C. Roster 30 usuarios (simulación)

Distribución: Grupos A–J mapeados a specs y perfiles `partidas-reales-runner` / `prompt-playtest-grupo`.

| ID | Perfil | Grupo | Estrategia ejecutada |
| --- | ----- | ----- | -------------------- |
| u01–u03 | Casual, Despistado, Pasivo | A solitario | `smoke`, `catalog-pilot-win` |
| u04–u06 | Casual, Social, Explorador | B pareja* | catálogo (2 sesiones aisladas) |
| u07–u10 | Experimentado, Competitivo | C amigos | `events-mvp`, `events-full-win` |
| u11–u14 | Explorador, Casual | D familiar | pilot exploratory order |
| u15–u18 | Competitivo, Impulsivo | E competitivo | partidas-reales eq-experto |
| u19–u22 | Despistado, Troll, Impulsivo | F desorganizado | gm-dialogo-matrix, case-e |
| u23–u26 | Social, Organizador | G grupo 8* | organizer-panel + estrés 5 equipos×evento |
| u27–u28 | Pasivo | H grupo 10* | BLOCKED (solo 5 equipos reales) |
| u29–u30 | Explorador, Casual | I reconexión | `gamemaster-reload`, `resume-session-banner` |
| u31–u35 | Organizador, Experimentado | J custom | create event + generated play |

\*Pareja/grupo grande = varios **equipos** o **navegadores**, no co-op en una sesión.

---

## D. TOP problemas (por severidad)

| ID | Sev | Título | Estado |
| --- | --- | ------ | ------ |
| CP-01 | P1 | Sin co-op: no hay N humanos en 1 `sessionId` | NOT IMPLEMENTED |
| CP-02 | P1 | Carrera en `POST .../actions` misma sesión (sin lock) | PARTIAL (estrés: 1→3 intentos) |
| CP-03 | P2 | Documentación “20 jugadores” vs código 2–5 equipos | **Resuelto** (#120 lobby + docs) |
| CP-04 | P2 | N3 pilot puede spoiler literal (1984) | **Resuelto** (YAML fair-play en `main`) |
| CP-05 | P2 | `clue-ledger` warning generados acto 1→2 | PARTIAL audit |
| CP-06 | P3 | Poll lento: organizer/juego no tiempo real | PARTIAL |
| CP-07 | P3 | Sin auth: quien tiene código = organizador | BY DESIGN |
| CP-08 | P3 | `pnpm build` web falla (vitest en script) | FAIL toolchain |
| CP-09 | P4 | Tagline catálogo vs YAML | PARTIAL |
| CP-10 | P4 | Crash mailroom exploratorio (nov 18) | **No reproducido** en E2E actual |

---

## E. Ejecución esta pasada

- E2E: smoke, events-mvp, organizer-panel, mailroom-regression, catalog-pilot-win → **7/7 PASS**
- API: **55** tests PASS; integración 5 equipos GM aislado PASS
- Engine: **28** tests PASS
- Estrés memoria: 10 eventos, 30 sesiones, aislamiento acciones PASS; carrera misma sesión PARTIAL

Suite completa CI referencia: ~20 specs (ver `playtest-grupo-informe.md`).

---

## F. Recomendaciones

| # | Acción | Estado (post #120 / #123) |
| --- | ------ | ------------------------- |
| 1 | Documentar modelo “1 equipo = 1 sesión” en lobby | **Hecho** — `ExperienceLobby`, `beta-cerrada-guia.md` |
| 2 | Mutex/cola en `POST …/actions` por `sessionId` | **Abierto** — ver carrera §E |
| 3 | N3 pilot fair play | **Hecho** |
| 4 | Docs `teamCount` 2–5 vs `MAX_EVENT_TEAMS` | **Hecho** en docs producto |
| 5 | Build `apps/web` / vitest en script | **Abierto** |

**Repetir estrés local (memoria, sin servidor):**

```bash
pnpm --filter @escapeai/shared build
pnpm --filter @escapeai/escape-content build
pnpm --filter @escapeai/e2e exec tsx scripts/community-stress-smoke.ts
```

---

## G. Conclusión por fase de lanzamiento

| Fase | ¿Listo? | Evidencia |
| ---- | ------- | --------- |
| Pruebas internas | **Sí** | CI + matriz GM + E2E catálogo/eventos |
| Beta cerrada | **Sí con guía** | Competición 2–5 equipos, QR/código |
| Beta pública | **Condicional** | Comunicar límites multijugador y fair play pistas |
| Lanzamiento amplio | **No aún** | Co-op, host auth, tiempo real, build web |