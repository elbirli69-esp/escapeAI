# ADR-0009: Cierre de decisiones pendientes (producto e infra MVP)

## Estado

Aceptado — 2026-10-31

## Contexto

Tras revisión de riesgos críticos (multiplayer, seguridad, reconexión, GM, experiencia Seis sospechosos), se cierran hipótesis abiertas en `PROJECT_ASSESSMENT.md`.

## Decisiones

| # | Tema | Decisión | Alternativa descartada |
|---|------|----------|------------------------|
| 1 | Hosting | Vercel + Supabase | VPS único (ops temprano) |
| 2 | Auth organizador | Supabase Auth | Clerk (añade vendor sin necesidad MVP) |
| 3 | Jobs IA | `creator_jobs` + cron/worker route | Inngest (añadir cuando volumen lo exija) |
| 4 | PDF | @react-pdf/renderer | Puppeteer (peso/coste) |
| 5 | Organizador jugando | No slot jugador; Host Dashboard | Host como 7º jugador |
| 6 | Idempotencia | Tabla `command_responses` | Solo constraint en events |
| 7 | Seq eventos | Columna `last_event_seq` en sesión | seq max(events) sin lock |
| 8 | Reconexión | `POST /resume` | Replay Realtime history |
| 9 | Seis sospechosos roles | 3 roles × 2 jugadores | 6 roles únicos |

## Consecuencias

- Migraciones deben incluir `command_responses` y `last_event_seq`.
- Fase 3 sigue `fixtures/six-suspects/EXPERIENCE_DESIGN.md`.
- Inngest/Clerk pueden reevaluarse en Fase 6 si hay requisitos enterprise.
