# Project Assessment — escapeAI

## Resumen del producto

**escapeAI** es una plataforma SaaS que permite a un **organizador** (usuario registrado y de pago) crear aventuras interactivas tipo escape room personalizadas con ayuda de IA, y a **participantes** (sin cuenta) unirse mediante enlace o QR para jugar en grupo, en modalidad **presencial** (cada uno con su móvil) o **remota** (dispositivos separados, estado compartido en tiempo real).

La propuesta de valor no es “generar acertijos en PDF”, sino un **motor multiplayer cooperativo** con información distribuida, roles, pruebas que exigen coordinación, NPCs conversacionales y un **Game Master IA** que narra y adapta el ritmo sin romper las reglas deterministas del juego.

**Primer público:** Friends & Parties.  
**Primer MVP jugable:** experiencia de referencia *El caso de los seis sospechosos* (6 jugadores, ~60 min, contenido inicialmente **manual**; IA conectada después).

## Estado del repositorio

| Aspecto | Estado |
|--------|--------|
| Código aplicación | No existe (solo `README.md`) |
| Infraestructura | No definida |
| Documentación previa | Ninguna |
| Entorno Cloud Agent | Linux, git remoto `escapeAI` |

Conclusión: **greenfield**. La Fase 0 puede definir estructura, contratos y modelo de datos sin deuda técnica.

## Alcance estratégico (horizonte MVP)

| Incluido en MVP | Fuera de MVP inicial |
|-----------------|----------------------|
| Motor de juego determinista + sesiones | Generación IA end-to-end |
| Multiplayer 2–10, guest join | Cuentas para jugadores |
| Experiencia manual “Seis sospechosos” | Editor visual de aventuras |
| Roles, pistas privadas, cooperación | Voz (ElevenLabs), AR |
| Host dashboard básico | Monetización completa |
| PWA mobile-first | Microservicios |
| 1 PDF imprimible + 1 prueba QR | Catálogo masivo de plantillas |

## Riesgos pendientes (post-cierre)

| Riesgo | Estado | Acción |
|--------|--------|--------|
| Fuga pistas/soluciones | Mitigado en diseño | Leak scanner CI + playtest Fase 3 |
| Carreras multiplayer | Mitigado en diseño | TX documentada; tests simultáneos Fase 2 |
| Coste GM IA | Abierto operativo | Presupuesto Fase 5; script fallback Fase 3 |
| Calidad narrativa IA | Abierto producto | Playtest; Creator Fase 4 |
| Límites Supabase Realtime | Bajo en MVP | Monitor; ADR-003 escalado |
| Complejidad fixture Seis sospechosos | Medio | `fixtures/six-suspects/EXPERIENCE_DESIGN.md` |

## Riesgos principales (histórico)

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Fugas de pistas/soluciones al cliente | Crítico (rompe el juego) | Autoridad servidor; vistas filtradas; soluciones solo en servidor |
| Condiciones de carrera en respuestas simultáneas | Alto | Comandos idempotentes; serialización por sesión; optimistic locking |
| Realtime en serverless (Vercel) | Alto | No WebSocket propio en MVP; Supabase Realtime o SSE + polling fallback |
| Complejidad del esquema JSON de experiencias | Medio | Zod estricto; fixture “Seis sospechosos”; validador en CI |
| Coste IA en runtime | Medio | GM con herramientas acotadas; presupuesto; caché; generación offline |
| Supabase RLS mal configurada | Crítico | Jugadores solo vía API con service role; RLS para organizador |
| Scope creep (IA Creator antes del motor) | Alto | Roadmap: motor → multiplayer → experiencia manual → IA |

## Decisiones arquitectónicas definitivas (cerradas)

Ver [ADR-0009](./ADR/0009-closed-product-decisions.md).

| Tema | Decisión |
|------|----------|
| Hosting | **Vercel** + **Supabase** (Postgres, Realtime, Storage, Auth) |
| Auth organizador | **Supabase Auth** |
| Jobs IA async | Tabla **`creator_jobs`** + worker invocado por cron Vercel / route protegida |
| PDF MVP | **`@react-pdf/renderer`** |
| Organizador en partida | **Solo Host Dashboard** (no slot jugador en MVP) |
| Concurrencia sesión | **`FOR UPDATE`** + `last_event_seq` + **`command_responses`** |
| Reconexión | **`POST /resume`** autoritativo; Realtime opcional |
| Roles en Seis sospechosos | **3 roles × 2 jugadores**; 6 pistas privadas (1/slot) |

## Decisiones ya tomadas (núcleo técnico)

Ver `ADR/` y `ARCHITECTURE.md`. Resumen:

- Monolito modular TypeScript (Next.js).
- PostgreSQL como fuente de verdad.
- Experiencias declarativas JSON versionadas (Zod).
- Motor de juego independiente de UI e IA.
- Log de eventos append-only por sesión.
- Guest tokens por jugador y sesión.

## Criterio de éxito del assessment

Un equipo (o agentes) puede iniciar **Fase 0–1** con contratos claros, modelo de datos, y tests de referencia sin ambigüedad sobre quién es autoridad del estado ni cómo se validan puzzles.

## Próximo paso inmediato

Implementar **Fase 0** (estructura repo, paquete `game-engine`, esquemas Zod, migraciones, fixture, tests unitarios de transiciones y puzzles) antes de cualquier UI elaborada.
