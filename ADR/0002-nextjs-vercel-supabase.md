# ADR-0002: Next.js en Vercel + Supabase (Postgres, Realtime, Storage)

## Estado

Aceptado

## Contexto

Se necesita app web PWA, API autoritativa, Postgres, archivos y señales realtime sin operar un cluster WebSocket en serverless.

## Decisión

- **Next.js** (App Router) en **Vercel**
- **Supabase** para PostgreSQL managed, Storage, Auth (organizadores), **Realtime** para señales

## Alternativas consideradas

| Alternativa | Motivo descarte MVP |
|-------------|---------------------|
| Self-hosted Postgres + Socket.io | Ops 24/7 |
| Ably + Neon | Segundo vendor y coste antes de tracción |
| Firebase | Modelo de datos menos natural para log relacional |
| Supabase solo sin Vercel | Posible, pero Vercel encaja con Next y previews |

## Consecuencias

- Lógica de partida en Route Handlers con `service_role`
- Realtime no transporta secretos; vistas vía HTTPS
- Vendor lock-in moderado mitigable (Postgres estándar)
