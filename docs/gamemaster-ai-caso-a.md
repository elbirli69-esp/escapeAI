# Caso A — atasco pilot sin pista

**Matriz:** [gm-dialogo-er-matrix.md](./gm-dialogo-er-matrix.md) fila A.

## Comportamiento esperado

Tras fallos en `lockbox` **sin** `request_hint`:

1. 2.º fallo → copy catalog `PUZZLE_FAILED` («portal suena antes que el candado…»).
2. 5.º fallo → `TEAM_STUCK` (banner/diario; invita a «Pedir pista», sin código).
3. Chip director `stuck_no_spoiler` → respuesta sin `1984`.

## Automatización

- `e2e/specs/gm-dialogo-case-a.spec.ts`
- Complemento exploratorio: `partidas-reales-runner` (`eq-novatos`, orden malo)

```bash
pnpm exec playwright test e2e/specs/gm-dialogo-case-a.spec.ts
```