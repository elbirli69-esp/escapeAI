# PROMPT — E2E autónomo: gancho, diversión, reto y variedad (escapeAI)

**Rol:** experto en QA lúdico de escape rooms + agente cloud que ejecuta Playwright y redacta informe con **notas por juego y por experiencia global**.  
**Objetivo:** validar de forma repetible que escapeAI **engancha**, **entretiene**, **desafía sin frustrar** y ofrece **variedad** entre modos — no solo que los tests técnicos pasen.  
**No objetivo:** sustituir playtests humanos largos ni juzgar calidad del copy del LLM sin API keys (usar fallbacks GM como baseline).

**Complementa:** [prompt-playwright-e2e.md](./prompt-playwright-e2e.md) (funcional), [prompt-coherencia-partidas.md](./prompt-coherencia-partidas.md) (mecánica), [prompt-entretenimiento-er.md](./prompt-entretenimiento-er.md) (diseño ER), [prompt-playtest-grupo-y-custom.md](./prompt-playtest-grupo-y-custom.md) (playtest multiequipo, eventos custom, dificultad e historias).

**Parametrización:** `e2e/experience-matrix.json`  
**Señales objetivas:** `pnpm experience-eval:signals`  
**Informe base:** `pnpm experience-eval:report` → `docs/experiencia-jugable-informe.md` (generado; no commitear salvo revisión humana).

---

## North star (qué debe demostrar la batería)

Al cerrar la ejecución autónoma debe quedar claro si un jugador típico diría:

1. **«Quiero seguir»** (gancho) — promesa clara en lobby, primer reto en &lt; 90 s, sensación de misterio.
2. **«Me lo pasé bien»** (diversión) — narrativa/G.M., progreso visible, cierre con payoff (no solo «código correcto»).
3. **«Tuve que pensar»** (reto) — al menos un fallo recuperable antes de acertar; pistas degradan sin regalar solución.
4. **«Esto no es siempre lo mismo»** (variedad) — mezcla de tipos de puzzle y modos (catálogo, evento, sensorial, geo).
5. **«La app no me pelea»** (fluidez) — sin errores flash, pestañas usables, permisos explicados.

Si Playwright falla en un perfil P0, la nota de ese juego queda **capada en 4,0/10** hasta que el spec vuelva a verde.

---

## Dimensiones de puntuación (0–10)

Cada **perfil de juego** en la matriz recibe una nota por dimensión y una **nota ponderada**. La **experiencia global** es la media ponderada de todos los perfiles ejecutados (peso `profile.weight` en la matriz).

| Dimensión | ID | Peso default | Qué mide |
| --------- | -- | ------------ | -------- |
| Gancho | `hook` | 20% | Tagline, escena 1, tiempo hasta primer puzzle activo, copy de stakes |
| Diversión | `fun` | 25% | Ritmo, líneas GM/engine, sensación de progreso, epílogo de victoria |
| Reto | `challenge` | 20% | Profundidad de puzzles, necesidad de explorar escenas, fallos antes del acierto (simulados) |
| Variedad | `variety` | 15% | Tipos de puzzle distintos, escenas, mecánicas sensoriales/geo vs código |
| Fluidez UX | `flow` | 10% | Errores UI, foco de pestañas, claridad de instrucciones |
| Cierre / payoff | `closure` | 10% | Pantalla victoria, meta narrativa, coherencia con promesa del lobby |

### Escala cualitativa (obligatoria en informe)

| Nota | Significado |
| ---- | ----------- |
| 9–10 | Referencia de producto; mejoras solo cosméticas |
| 7–8 | Sólido; 1–2 mejoras claras por dimensión |
| 5–6 | Jugable pero plano o confuso en algún eje |
| 3–4 | Fallos UX o poca diversión; bloquea recomendación |
| 0–2 | Roto, engañoso o frustrante (o e2e rojo) |

### Scoring objetivo (v1, sin juicio manual)

| Artefacto | Rol |
| --------- | --- |
| `e2e/rubric-components.json` | Fórmulas por componente + textos de mejora |
| `e2e/scripts/experience-rubric.ts` | Cálculo determinista 0–10 por dimensión |
| `e2e/specs/experience-metrics.spec.ts` | Métricas runtime → `.cache/experience-metrics.json` |
| `e2e/.cache/playwright-results.json` | Pass/fail por spec |
| `pnpm experience-eval:score` | `.cache/experience-scores.json` + `docs/experiencia-mejora-plan.md` |

Cada dimensión = `(suma points componentes / suma maxPoints) × 10`. Cap **4.0** en perfil **P0** si algún spec del perfil falla.

**Plan de implementación:** cada componente con `points < maxPoints` genera un ítem en `experiencia-mejora-plan.md` con `improvementHint` y evidencia numérica.

---

## Alcance: perfiles parametrizados

Editar `e2e/experience-matrix.json` para añadir salas o tipos de evento. Campos clave por perfil:

| Campo | Uso |
| ----- | --- |
| `id` | Clave en informe |
| `label` | Nombre legible |
| `mode` | `catalog` \| `event` \| `lobby` |
| `roomId` / `eventPreset` | Qué sala o fixture de evento |
| `e2eSpecs` | Specs Playwright que deben pasar |
| `priority` | `P0` (bloquea release) \| `P1` \| `P2` |
| `weight` | Peso en nota global |
| `playwrightTags` | (opcional) `@gancho` etc. si se añaden tags en specs |
| `evaluateDimensions` | Subconjunto de dimensiones si es smoke parcial |
| `params` | Parámetros de ejecución (ver abajo) |

### Parámetros de ejecución (`params`)

```json
{
  "simulateWrongAttempts": 1,
  "requestHint": false,
  "measureTimeToFirstPuzzle": true,
  "captureGmLines": true,
  "mockGeo": true,
  "mockCamera": true,
  "eventFixture": "SARA_EVENT",
  "adventureTypes": ["birthday", "mystery", "team", "celebration"]
}
```

- **`simulateWrongAttempts`:** antes del acierto, enviar respuesta incorrecta y comprobar que hay feedback sin soft-lock.
- **`requestHint`:** pulsar pista manual si `data-testid` existe; puntuar si la pista orienta sin spoiler total.
- **`adventureTypes`:** para auditoría de variedad en generador, ejecutar `pnpm audit-coherence` y revisar diferenciación (no e2e completo por tipo salvo que exista spec).

Perfiles por defecto cubren: `pilot`, `lighthouse`, `interactive-lab`, `geo-lab`, `events-mvp`, `organizer`, `smoke`, `resume`, `gamemaster-reload`.

---

## Procedimiento autónomo (agente cloud)

Ejecutar **en orden**; no saltar pasos.

### Fase 0 — Prerrequisitos

```bash
pnpm install
pnpm build
pnpm validate-rooms
pnpm audit-coherence
```

Si `validate-rooms` o `audit-coherence` reportan **error**, corregir contenido antes de puntuar diversión.

### Fase 1 — Señales objetivas

```bash
pnpm experience-eval:signals
```

Guardar salida JSON (`e2e/.cache/experience-signals.json`).

### Fase 2 — E2E funcional (base de confianza)

```bash
pnpm exec playwright install chromium   # si hace falta
pnpm test:e2e
```

Opcional por perfil:

```bash
pnpm --filter @escapeai/e2e exec playwright test specs/catalog-pilot-win.spec.ts
```

Registrar: duración por spec, fallos, retries.

### Fase 3 — Observación lúdica (agente)

Para cada perfil **P0/P1** con victoria o recorrido parcial documentado:

1. Abrir lobby → anotar **tagline** y coherencia con escena 1.
2. Cronometrar (desde `escape-start-classic` o join evento) hasta primer `escape-puzzle-tab-*` activo.
3. Con `simulateWrongAttempts`, verificar mensaje de error y que el puzzle sigue editable.
4. Listar tipos de interacción vividos (código, inventario, sonido, voz, cámara, geo, visual).
5. Leer `escape-game-status` al ganar o último estado alcanzado: ¿payoff narrativo?
6. Si hay GM: contar intervenciones visibles (`escape-gm-line`).

**Prohibido:** saltar la UI con `POST /api` salvo mocks documentados en fixtures (`media-mock`, geolocation).

### Fase 4 — Puntuar y redactar

```bash
pnpm experience-eval:report
```

El agente **completa** el informe generado:

- Tabla de notas por perfil y dimensión.
- **Nota global** (/10) con fórmula documentada.
- Top 3 fortalezas y **mejoras priorizadas por juego** (máx. 3 bullets).
- **Mejoras de experiencia completa** (cross-modo): variedad de catálogo vs eventos, ritmo GM, labs vs producto.

### Fase 5 — Acción (solo si el brief lo pide)

- P0 rojo → fix producto + spec, no bajar umbral de nota.
- Nota &lt; 6 en `hook` o `fun` en sala de catálogo → proponer cambio YAML mínimo o GM fallback (alinear con [prompt-entretenimiento-er.md](./prompt-entretenimiento-er.md)).

---

## Fórmula nota global

```
nota_perfil = Σ (dimensión_nota × peso_dimensión)   # pesos en matrix.rubric.weights
nota_global = Σ (nota_perfil × profile.weight) / Σ profile.weight
```

Redondear a **una decimal**. Incluir intervalo de confianza cualitativo: `±0.5` si no se ejecutaron todos los P1.

---

## Formato de informe esperado

```markdown
# Informe experiencia jugable — {fecha ISO}

## Resumen ejecutivo
- Nota global: X.X / 10
- Perfiles ejecutados: N (P0: …, fallos: …)
- Veredicto una línea: …

## Matriz de notas

| Perfil | Gancho | Diversión | Reto | Variedad | Fluidez | Cierre | **Total** | e2e |
| ------ | ------ | --------- | ---- | -------- | ------- | ------ | --------- | --- |
| pilot  | …      | …         | …    | …        | …       | …      | …         | ok  |

## Variedad cross-modo
- Tipos de puzzle vistos en la batería: …
- Modos aún sin e2e de victoria: …

## Mejoras por juego
### pilot
1. …

## Mejoras experiencia completa
1. …

## Evidencias
- Specs y duraciones: …
- Citas de copy (escena 1 / victoria): …
```

---

## Extensión de specs (cuando el agente implementa)

Al añadir sala o modo:

1. Entrada nueva en `experience-matrix.json`.
2. Spec Playwright con recorrido ganador o parcial acordado.
3. Hook opcional en spec para métricas:

```typescript
test("@experience pilot full win", async ({ page }) => {
  const t0 = Date.now();
  await startClassicRoom(page, "pilot");
  await page.getByTestId(/escape-puzzle-tab-/).first().waitFor();
  test.info().annotations.push({
    type: "timeToFirstPuzzleMs",
    description: String(Date.now() - t0),
  });
});
```

4. Actualizar tabla en [prompt-playwright-e2e.md](./prompt-playwright-e2e.md).

---

## Umbrales de release sugeridos

| Gate | Condición |
| ---- | --------- |
| Técnico | Todos los perfiles `P0` con e2e verde |
| Producto mínimo | Nota global ≥ **6.5** y ningún catálogo `pilot`/`lighthouse` &lt; **6.0** en `hook`+`fun` |
| Aspiration | Nota global ≥ **7.5**; `variety` ≥ **7** en al menos 3 perfiles distintos |

---

## Checklist rápido del agente (copiar al final del informe)

- [ ] `pnpm test:e2e` verde
- [ ] Matriz completa puntuada con evidencia
- [ ] Mejoras priorizadas por juego y globales
- [ ] Perfiles P2 omitidos declarados explícitamente
- [ ] Sin commitear `docs/experiencia-jugable-informe.md` salvo release notes acordadas