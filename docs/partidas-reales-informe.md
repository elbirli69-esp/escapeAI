# Informe partidas reales — 2026-11-18

Ejecución según [prompt-partidas-reales-jugadores.md](./prompt-partidas-reales-jugadores.md). **No commiteado por defecto** (JSON en `e2e/.cache/`).

## Resumen

| Concepto | Resultado |
| -------- | --------- |
| `gitSha` | `60ff092` (rama `cursor/partidas-reales-prompt-1aea`) |
| Corridas `real_session_*` | **6** (`e2e/.cache/partidas-reales-runs.json`) |
| Runner | `pnpm --filter @escapeai/e2e exec playwright test specs/partidas-reales-runner.spec.ts` |
| `audit-coherence` | Sin errores bloqueantes |
| `experience-eval` global | **9,86/10** |
| LLM GM | **no_configurado** |

### Cobertura vs campaña mínima (§7)

| Requisito | Estado |
| --------- | ------ |
| ≥10 partidas reales | **Parcial** — 6 sesiones nuevas con `sessionId` distinto |
| pilot ≥3 | **Parcial** — 2 (novatos mailroom, experto victoria) |
| lighthouse ≥2 | **Parcial** — 1 parcial |
| labs ≥1 c/u | **OK** — interactive-lab, geo-lab |
| 4 `adventureType` | **Parcial** — solo `birthday` en UI |
| 6 perfiles `teamId` | **Parcial** — novatos, experto, sensorial |

## Tabla veredictos

| Partida | Equipo | Modo | Global | Dificultad | Jugabilidad | Notas |
| ------- | ------ | ---- | ------ | ---------- | ----------- | ----- |
| pilot | eq-novatos | exploratorio | **iterate** | pass 7 | pass 7 | Orden malo; mailroom **sin crash** (contrasta informe computerUse previo) |
| pilot | eq-experto | exploratorio | ship | adjust 6 | pass 8.5 | Victoria ~3 s automatizada (curva baja para veteranos) |
| lighthouse | eq-sensorial | parcial | ship | pass 7.5 | — | `fog_horn` + fallo `tide_lock` + pista |
| event Sara | eq-novatos | parcial | ship | pass 7.5 | pass 7.5 | Personalización 1995 vía pistas |
| interactive-lab | eq-sensorial | parcial | ship | — | pass 7.5 | Sonido 0→3 |
| geo-lab | eq-novatos | parcial | ship | pass 7 | — | Geo mock + pedestal CAT |

## Decisiones de producto (accionables)

1. **Pilot N3 candado** — sigue riesgo de spoiler literal; mantener `adjust` en `hints` para eq-novatos.
2. **Dificultad experto pilot** — victoria muy rápida sin fallos; valorar beats extra o modo «difícil».
3. **Campaña** — faltan `celebration` / `mystery` / `team` por lobby, segundo run lighthouse, pilot tercero eq-lectores, abandonos simulados explícitos.
4. **Concordancia métricas** — `experience-eval` 9.86 alto; exploratorio novatos **iterate** por pistas — documentar tensión en releases.

## Evidencia

Detalle cronológico por run: `e2e/.cache/partidas-reales-runs.json`.