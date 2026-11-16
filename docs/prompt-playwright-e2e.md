# Prompt: Playwright — casos de uso E2E del juego

**Implementado:** paquete `e2e/` con specs P0/P1. Ejecución: `pnpm test:e2e` (requiere `pnpm build` previo en CI).

Ver specs en `e2e/specs/` y helpers en `e2e/fixtures/`.

**Relacionado:** [Tester E2E experiencia](./prompt-e2e-tester-experiencia.md) · [QA manual](./qa-mobile-puzzles.md) · [Arquitectura](./architecture.md)

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
| `events-mvp.spec.ts` | Crear evento, 2 sesiones, candado 1995 |
| `interactive-lab-partial.spec.ts` | Sensoriales (cámara vía API) |
| `geo-lab-mocked.spec.ts` | GPS mock + quiz |
| `catalog-lighthouse-win.spec.ts` | Victoria faro (`HIGH` → aceite → `SOS`) |
| `organizer-panel.spec.ts` | Ranking tras unir equipo |
