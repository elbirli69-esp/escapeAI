# Prueba funcional (obligatoria por cambio)

Cada PR con cambio de producto debe demostrar el comportamiento **de punta a punta**, no solo tests unitarios.

## Checklist mínimo

| Capa | Comando | Cuándo |
|------|---------|--------|
| Unitario / motor | `pnpm test` | Siempre |
| Coherencia sala | `pnpm audit-coherence` | Contenido generado / YAML |
| **Funcional UI/API** | `pnpm test:e2e` | PWA, API, flujos lobby/partida/organizador |

## Dónde añadir cobertura

- Nuevos `data-testid` en UI cuando el flujo sea crítico.
- Spec en `e2e/specs/<feature>.spec.ts`.
- Fixtures reutilizables en `e2e/fixtures/`.

## Mapa actual (referencia)

| Iniciativa | Spec |
|------------|------|
| P5 híbrido | `e2e/specs/p5-hybrid.spec.ts` |
| Eventos MVP | `e2e/specs/events-mvp.spec.ts` |
| Organizador | `e2e/specs/organizer-panel.spec.ts` |
| Sensorial lab | `e2e/specs/interactive-lab-partial.spec.ts` |

Ejecutar un archivo concreto:

```bash
cd e2e && pnpm run e2e -- specs/p5-hybrid.spec.ts
```