# ADR-0004: Log de eventos append-only como historial autoritativo

## Estado

Aceptado

## Contexto

Multiplayer requiere auditoría, replay tras crash, idempotencia y debug de condiciones de carrera.

## Decisión

- Tabla `game_events` con `seq` monótono por sesión
- Snapshot opcional en `game_sessions` para replay acelerado
- Estado derivado = snapshot + replay o estado en memoria post-transacción

## Alternativas

| Alternativa | Motivo descarte |
|-------------|-----------------|
| Solo JSON snapshot | Pierde auditoría y idempotencia fina |
| CRDT cliente | Violación autoridad servidor |
| Event sourcing completo sin snapshots | Replay lento en partidas largas |

## Consecuencias

- Crecimiento de filas; política retención en DATA_MODEL
- Tests de replay obligatorios
