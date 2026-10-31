# MVP Scope — escapeAI

## Objetivo del MVP

Demostrar que **seis personas** pueden completar **El caso de los seis sospechosos** (~60 min) en modalidad **presencial o remota**, con:

- Motor de juego estable y autoritativo
- Multiplayer sincronizado con pistas privadas y cooperación
- Host dashboard operativo
- Contenido de la aventura **authored manualmente** (JSON + assets)
- Sin dependencia de generación IA para jugar

La IA (Creator / GM) se conecta **después** de validar diversión y fiabilidad técnica.

---

## Incluido

### Experiencia “Seis sospechosos”

| Elemento | Detalle |
|----------|---------|
| Jugadores | 6 |
| Duración | 60 min (timer servidor) |
| Pruebas | 7 (tipos mixtos del motor) |
| Roles | 3 activos con pistas diferenciadas (6 roles definidos, 3 asignados por partida — configurable en fixture) |
| Pistas privadas | 6 |
| Cooperativas | 2 |
| NPC IA | 1 sospechoso (Fase 5; MVP manual puede usar diálogo scriptado sin LLM hasta Fase 5) |
| Evento narrativo automático | 1 timed |
| PDF imprimible | 1 |
| Prueba QR | 1 (escaneo abre URL con token de un solo uso o validación código) |
| Final | Personalizado por flags de decisión |

### Plataforma

- Creator Studio **mínimo**: publicar versión fija / crear sesión desde experiencia seeded
- Player PWA: join, rol, pistas, puzzles, inventario, progreso, timer
- Host dashboard: jugadores, fase, puzzles, pausa, fin
- Guest tokens
- Supabase Postgres + Realtime señales + Storage para PDF/imagen
- Tests: unit motor + integración API + harness 6 clientes

---

## Excluido explícitamente

| Tema | Motivo |
|------|--------|
| AI Creator end-to-end | Fase 4 |
| AI Game Master LLM | Fase 5 (opcional script NPC en Fase 3) |
| Pagos / planes | Fase 6 |
| Registro de jugadores | Product decision: solo guests |
| Editor visual de puzzles | Coste; JSON interno + seed |
| Chat entre jugadores | Fuera foco; share de pistas |
| Voz ElevenLabs | Coste/complejidad |
| AR / visión / cajas físicas | Hardware |
| Multi-idioma UI | Solo es-ES MVP |
| Replays públicos / espectadores | — |
| Apps nativas iOS/Android | PWA suficiente |
| Microservicios | Monolito |
| WebSocket propio | Realtime Supabase en MVP |
| Más de una aventura en catálogo | Una fixture + pipeline para añadir la 2ª |

---

## Modalidades presencial vs remota

Misma build. Diferencias solo de copy/UI:

- Presencial: animar a hablar en voz alta; QR físico
- Remota: énfasis en botón compartir pista y estado equipo

No hay fork de lógica de servidor.

---

## Criterios de aceptación MVP (definitivos)

1. 6 dispositivos reales completan la partida sin inconsistencias de estado.
2. Ningún cliente expone soluciones ni pistas privadas ajenas (verificado en tests e inspección red).
3. Reconexión de un jugador restaura vista correcta en < 5 s percibidos.
4. Host puede pausar y reanudar; timer coherente.
5. PDF y QR funcionan en flujo documentado.
6. CI ejecuta suite crítica verde (motor + integración + multi-client).

---

## Degradación aceptable

- GM NPC con árbol de respuestas scriptado si Fase 5 no está lista
- Imágenes estáticas pre-hechas vs generadas
- Polling 3s si Realtime falla

---

## Fuera de alcance pero preparado en arquitectura

- `schemaVersion` en definitions
- Tools GM en contratos de comandos
- `creator_jobs` tabla (puede crearse vacía en Fase 0)
