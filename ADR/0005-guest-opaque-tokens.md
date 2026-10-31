# ADR-0005: Tokens opacos para jugadores invitados

## Estado

Aceptado

## Contexto

Participantes sin cuenta; acceso limitado a una sesión y un jugador; revocación posible.

## Decisión

Token aleatorio largo entregado una vez al join; almacenar hash en `players`; API valida token → `(session_id, player_id)`.

## Alternativas

| Alternativa | Motivo descarte MVP |
|-------------|---------------------|
| JWT en localStorage | Revocación y rotación más complejas |
| Supabase anon + RLS por jugador | RLS difícil de acertar con pistas |
| Cookie httpOnly | Multidispositivo mismo jugador menos claro |

## Consecuencias

- Pérdida de token = host reasigna slot o regenera
- Migración a JWT posible manteniendo hash table
