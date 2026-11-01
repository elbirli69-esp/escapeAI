# ADR-0003: Realtime señal + pull de vistas filtradas

## Estado

Aceptado

## Contexto

Pistas privadas y soluciones no pueden broadcastearse a todos los clientes. Vercel no hospeda WebSocket persistente propio de forma trivial.

## Decisión

Tras cada commit de comandos:

1. Persistir eventos en Postgres
2. Broadcast Realtime mínimo `{ seq, status, phaseId }`
3. Clientes hacen `GET view` con token de jugador para datos filtrados

## Alternativas

| Alternativa | Cuándo reconsiderar |
|-------------|---------------------|
| Canal Realtime por jugador con payload completo | Optimización latencia Fase 2.1 |
| WebSocket dedicado (PartyKit, Fly) | >500 salas concurrentes |
| SSE solo | Si Realtime problemático en redes corporativas |

## Consecuencias

- Más requests HTTPS; aceptable para 6 jugadores
- Privacidad centralizada en proyecciones del servidor
