# Prompt: Playwright — casos de uso E2E del juego

**Objetivo:** Implementar una suite **Playwright** que pruebe la PWA + API en el estado actual de `main` (catálogo, partida clásica, eventos MVP, puzzles sensoriales P0/P1 y GPS), ejecutable en local y en CI sin Redis ni claves de IA.

**Relacionado:** [QA manual sensorial](./qa-mobile-puzzles.md) · [Arquitectura](./architecture.md) · [Motor e2e vitest](../packages/escape-engine/src/rooms.test.ts) (recorridos sin browser).

---

## Rol del agente

Actúa como **QA Engineer + automatizador Playwright** en el monorepo `escapeAI`. No sustituyas los tests Vitest del motor; añade **smoke y recorridos UI** que demuestren que el cableado HTTP, React y persistencia en memoria funcionan. Prioriza estabilidad en CI (Linux, sin hardware real).

**Definition of Done**

1. Paquete `e2e/` (o `apps/e2e`) con `@playwright/test`, `playwright.config.ts`, `webServer` que levanta API (8787) + Vite (5173) o usa `pnpm dev` con espera a `/api/health`.
2. Scripts raíz: `pnpm test:e2e` (headed opcional `test:e2e:ui`).
3. Job opcional en `.github/workflows/ci.yml` (matrix solo si tiempo < 8 min).
4. **data-testid** mínimos en lobby y juego (ver tabla abajo) — sin cambiar UX visible.
5. Casos **P0** en verde en local; P1 con mocks; P2 documentados como `test.skip` + issue si dependen de GPS/mic real.
6. README o este doc actualizado con cómo ejecutar.

---

## Contexto técnico (no reinventar)

| Pieza | Detalle |
| ----- | ------- |
| Web | Vite React PWA, proxy `/api` → `http://127.0.0.1:8787` |
| API | Hono `basePath /api`, sesiones en **memory** si no hay Redis |
| Acciones | `POST /api/sessions/:id/actions` con `GameAction` (`submit_answer`, `submit_location`, `complete_interaction`, …) |
| Salas catálogo | `pilot`, `lighthouse`, `interactive-lab`, `geo-lab` (`ROOM_CATALOG`) |
| Vitest | Victorias pilot/lighthouse ya documentadas en `rooms.test.ts` — **reutiliza las mismas respuestas** en UI |

Variables CI/local:

```bash
# API sin Redis, sin narrador obligatorio
unset UPSTASH_REDIS_REST_URL KV_REST_API_URL
# Opcional: desactivar llamadas reales a Pexels/fal en tests (stub en Playwright)
```

---

## data-testid (añadir en `apps/web`)

Implementar antes o durante los tests (convención `escape-*`):

| ID | Componente | Uso |
| ---- | ----------- | ----- |
| `escape-lobby-home` | `ExperienceLobby` home | Assert landing |
| `escape-mode-catalog` | Botón catálogo | Entrar a salas |
| `escape-room-{id}` | Tarjeta sala | p. ej. `escape-room-pilot` |
| `escape-start-classic` | Empezar partida | Crear sesión |
| `escape-puzzle-tab-{id}` | Tab puzzle | Seleccionar reto |
| `escape-answer-input` | Input respuesta | `fill` |
| `escape-submit-answer` | Enviar respuesta | `click` |
| `escape-exit-{toSceneId}` | Salida escena | `move` |
| `escape-game-status` | Banner fin | `won` / `lost` |
| `escape-flash-error` | FlashBanner error | Assert rechazo |
| `escape-narrative-log` | Última línea diario | Progreso |
| `escape-event-create-submit` | Wizard crear evento | MVP eventos |
| `escape-join-code-input` | Código unión | Join equipo |

No hace falta testid en cada botón sensorial al inicio: usar `getByRole('button', { name: /reproducir|enviar|estoy aquí/i })` y refinar si flaky.

---

## Estructura de carpetas sugerida

```
e2e/
  playwright.config.ts
  fixtures/
    game.ts          # helpers: startPilotSession(page), submitAnswer(...)
    api.ts           # healthCheck, optional direct POST actions
  mocks/
    pexels.route.ts  # route.fulfill imagen 1x1
    geolocation.ts   # context.setGeolocation + permissions
  specs/
    smoke.spec.ts
    catalog-pilot-win.spec.ts
    catalog-lighthouse-win.spec.ts
    events-mvp.spec.ts
    interactive-lab-partial.spec.ts
    geo-lab-mocked.spec.ts
  rooms/
    answers.pilot.json   # copiar de rooms.test.ts
```

`playwright.config.ts` — fragmento orientativo:

```ts
export default defineConfig({
  testDir: "./specs",
  fullyParallel: false, // sesiones y puertos
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter @escapeai/api exec tsx src/index.ts",
      url: "http://127.0.0.1:8787/api/health",
      reuseExistingServer: !process.env.CI,
      env: { PORT: "8787" },
    },
    {
      command: "pnpm --filter @escapeai/web exec vite --port 5173",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

Instalar: `pnpm add -D @playwright/test -w` (o en `e2e/package.json` workspace) + `npx playwright install chromium` en CI.

---

## Casos de uso (prioridad)

### P0 — Smoke (obligatorio)

| ID | Caso | Pasos | Esperado |
| ---- | ---- | ----- | -------- |
| S1 | Health + catálogo | `GET /api/health`; abrir `/`; catálogo → lista ≥4 salas | JSON `ok:true`; tarjetas visibles |
| S2 | Crear sesión pilot | Catálogo → pilot → empezar | URL/partida; escena «Entrada»; tab `Candado` |
| S3 | Error visible | Enviar respuesta vacía | Flash error, sin `alert` nativo |
| S4 | Victoria pilot (UI) | Recorrido completo (ver tabla respuestas) | `escape-game-status` → «Escapaste» |

**Recorrido pilot (respuestas fijas YAML):**

1. Puzzle `lockbox`: `1984` → enviar.
2. Salida «Bajar al sótano» → disponible.
3. Coger fusible → tab `Cuadro de fusibles` → **Usar** objeto (inventory puzzle).
4. Salida sala de control.
5. Puzzle `panel_final`: `LUZ` → victoria.

### P0 — Eventos MVP

| ID | Caso | Datos fijos | Esperado |
| ---- | ---- | ----------- | -------- |
| E1 | Crear evento | Tipo `birthday`, 2 equipos, 45 min, sujeto `Sara García`, apodo `Sara`, facts del test `event-flow.test.ts` | Preview con `joinCode` |
| E2 | Unir equipo A/B | Dos equipos distintos, mismo código | Dos `sessionId` distintos (comprobar vía API o localStorage key) |
| E3 | Primera escena jugable | Equipo A inicia partida | Puzzles `sound_intro`, `entry_lock` visibles |
| E4 | Candado numérico | Resolver `entry_lock` con año derivado de facts (`1995` en fixture Sara) | Narrativa «resuelto»; salida acto 2 si aplica |

Para E4: usar **mismo fixture** que `apps/api/src/event-flow.test.ts` (año en fact) o leer `answer` vía `GET` session + inspección de estado en UI.

### P1 — Sensorial (mock / atajos UI)

| ID | Sala | Estrategia | Esperado |
| ---- | ---- | ---------- | -------- |
| I1 | `interactive-lab` sonido | Clic reproducir beeps; esperar `minListenSec` + fin; respuesta `3` | Paso `listen` implícito; acierto |
| I2 | Visual dual | Esperar 2s auto-`view` o botón; respuesta `3` | Acierto |
| I3 | Cámara | Stub: no abrir webcam en CI — **inyectar** `complete_interaction` vía `page.evaluate` + `fetch` a API **solo si** no hay flag testid; preferir sala `e2e-camera.yaml` mínima con `cameraMode: keyword` y mock getUserMedia | Ver nota hardware |
| I4 | Voz | Fallback texto `luego` con `allowTextFallback` | Victoria lab (`voice_finale`) |

**Nota cámara/mic en CI:** Playwright puede `page.context().grantPermissions(['camera'])` + `navigator.mediaDevices` mock; si es frágil, añadir sala `e2e-fixtures/sensor-smoke.yaml` con puzzles `code` + un solo `sound` beeps para no bloquear el merge.

### P1 — GPS mock

| ID | Caso | Mock |
| ---- | ---- | ---- |
| G1 | `geo-lab` reach | `context.setGeolocation({ latitude: 40.4169, longitude: -3.7035 })` + permissions; «Estoy aquí» | Puzzle `llegar_sol` resuelto |
| G2 | Quiz ciudad | Misma coords; respuesta `madrid` | Victoria sala / escena 2 |

Usar `browserContext.grantPermissions(['geolocation'])` y coordenadas del YAML (`geo-lab.yaml`).

### P2 — Manual / nightly (opcional)

- Lighthouse victoria completa en UI.
- Evento generado: recorrido 3 actos hasta `final_code`.
- Panel organizador: leaderboard tras 2 equipos (poll o WebSocket si existe).
- iPhone WebKit project (`playwright-webkit`) en macOS only — documentar, no CI Linux.

---

## Patrones de implementación

### Helper `submitAnswer(page, value)`

```ts
await page.getByTestId("escape-answer-input").fill(value);
await page.getByTestId("escape-submit-answer").click();
await expect(page.getByTestId("escape-flash-error")).not.toBeVisible({ timeout: 500 });
```

Si error esperado (caso S3), invertir assert.

### Stub medios externos

Interceptar antes de navegar:

- `**/api/media/pexels**` → JSON `{ url: "/media/pilot-entrance.jpg" }` o fixture PNG mínimo.
- Pixabay audio (eventos): `route.abort` o archivo local corto en `e2e/fixtures/beep.mp3`.

Evita flakes por red y rate limits.

### Aislar Redis

En `webServer.env` del API **no** definir variables Upstash. Comprobar en S1 que `persistence: "memory"` en health.

### Narrador IA

No asserts sobre texto generado. Opcional: badge «Narrador» solo si `OPENAI_API_KEY` — en CI dejar sin clave.

### Paralelismo

Un worker por defecto; specs que crean eventos con mismo `joinCode` deben usar `test.describe.serial`.

---

## CI (GitHub Actions)

Añadir job `e2e`:

```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with: { version: 9.15.0 }
    - uses: actions/setup-node@v4
      with: { node-version: 22, cache: pnpm }
    - run: pnpm install --frozen-lockfile
    - run: pnpm build
    - run: npx playwright install --with-deps chromium
    - run: pnpm test:e2e
```

Subir artefacto `playwright-report` en fallo.

---

## Checklist de regresión (al ampliar salas)

- [ ] ¿Nuevo puzzle type en UI? → spec mínimo o extender `interactive-lab`.
- [ ] ¿Cambio en `GameAction`? → actualizar `fixtures/api.ts`.
- [ ] ¿Nueva sala catálogo? → smoke opcional en `smoke.spec.ts`.
- [ ] `pnpm validate-rooms` + `pnpm test` + `pnpm test:e2e` en verde.

---

## Prompt corto (copiar al agente ejecutor)

```
TAREA — Playwright E2E escapeAI

Lee docs/prompt-playwright-e2e.md y docs/architecture.md.

1. Crea paquete e2e con Playwright, webServer API (8787) + Vite (5173), pnpm test:e2e.
2. Añade data-testid listados en el doc (lobby + GameView + formularios evento).
3. Implementa specs P0: smoke, victoria pilot UI, evento MVP crear+unir+candado 1995 (fixture Sara).
4. Implementa P1: interactive-lab (sonido/visual/voz texto); geo-lab con mock geolocation.
5. Stub Pexels/audio en red; sesiones memory-only.
6. Job CI e2e opcional si runtime < 8 min.
7. No elimines tests Vitest. Commit en rama cursor/playwright-e2e-*-77f8 + PR.

Criterio: CI verde con chromium headless; sin OPENAI, sin Redis, sin permisos hardware reales.
```

---

## Referencia rápida respuestas (catálogo)

| Sala | Puzzle | Respuesta |
| ---- | ------ | --------- |
| pilot | lockbox | `1984` |
| pilot | fuse_slot | usar item `fuse` |
| pilot | panel_final | `LUZ` |
| lighthouse | tide_lock | `high` (+ recorrido items — ver `rooms.test.ts`) |
| interactive-lab | sound_station | `3` (tras listen) |
| interactive-lab | visual_station | `3` (tras view) |
| interactive-lab | camera_station | `7` (tras capture; mock en CI) |
| interactive-lab | voice_finale | `luego` (texto o voz) |
| geo-lab | ciudad_quiz | `madrid` (tras GPS mock) |

Fin del brief.
