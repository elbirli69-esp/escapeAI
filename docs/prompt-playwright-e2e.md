# Prompt: Playwright — casos de uso E2E del juego

**Implementado:** paquete `e2e/` con specs P0/P1. Ejecución: `pnpm test:e2e` (requiere `pnpm build` previo en CI).

Ver specs en `e2e/specs/` y helpers en `e2e/fixtures/`.

**Relacionado:** [QA manual](./qa-mobile-puzzles.md) · [Arquitectura](./architecture.md) · [Experiencia jugable E2E](./prompt-e2e-experiencia-jugable.md) (gancho, diversión, notas) · [Playtest en grupo v2](./prompt-playtest-grupo.md)

## Ejecutar

```bash
pnpm install
pnpm build
pnpm exec playwright install chromium   # una vez
pnpm test:e2e
pnpm test:e2e:ui                      # modo interactivo
```

Variables: API en memoria (sin Redis). Los `webServer` de Playwright levantan API + Vite automáticamente si `CI=1` o no hay servidores en 8787/5173.

## Reglas (obligatorias)

1. **Tests funcionales:** interacción real en la PWA (clic, formulario, permisos). No saltar pasos con `POST` directo al API salvo documentar excepción.
2. **Fallo = arreglar producto:** si un test obliga a un hack, corregir la app (ej. panel organizador que abría ranking al escribir sin enviar).
3. **Hardware en CI:** mock de `getUserMedia` / geolocation en fixtures, no omitir la UI.

## Specs

| Archivo | Cobertura |
| ------- | --------- |
| `smoke.spec.ts` | Health, catálogo, validación UI |
| `catalog-pilot-win.spec.ts` | Victoria pilot completa |
| `pilot-exploratory-order.spec.ts` | Candado antes que timbre → mailroom (orden playtest) |
| `events-mvp.spec.ts` | Crear evento, 2 sesiones, candado 1995 |
| `events-full-win.spec.ts` | Victoria completa evento fixture Sara |
| `interactive-lab-partial.spec.ts` | Sensoriales (cámara vía API) |
| `geo-lab-mocked.spec.ts` | GPS mock + quiz |
| `catalog-lighthouse-win.spec.ts` | Victoria faro (`HIGH` → aceite → `SOS`) |
| `organizer-panel.spec.ts` | Ranking tras unir equipo |
