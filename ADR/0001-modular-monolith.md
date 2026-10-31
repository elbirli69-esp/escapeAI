# ADR-0001: Monolito modular TypeScript

## Estado

Aceptado

## Contexto

Producto early-stage; equipo pequeño; necesidad de iterar rápido en motor, API y UI.

## Decisión

Un **monolito modular** en un repositorio pnpm:

- `packages/game-engine` sin dependencias de framework
- `apps/web` Next.js consume engine y shared

## Alternativas consideradas

| Alternativa | Motivo descarte |
|-------------|-----------------|
| Microservicios (game, ai, realtime) | Ops y contratos prematuros |
| Backend separado Express/Fastify | Duplica despliegue sin beneficio MVP |
| Rust motor | Menor velocidad de iteración equipo TS |

## Consecuencias

- Escalar verticalmente y por serverless concurrency al inicio
- Extracción futura del motor a servicio posible porque ya es paquete puro
