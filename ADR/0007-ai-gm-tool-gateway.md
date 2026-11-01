# ADR-0007: AI Game Master solo vía herramientas → comandos del motor

## Estado

Aceptado

## Contexto

Evitar que el GM altere estado o filtre secretos.

## Decisión

Adaptador `ai-gm` traduce function calls a `GameCommand` con flag `authorized`. Motor rechaza comandos no permitidos en estado actual.

Contexto GM construido con slices públicos + vista del jugador actual.

## Alternativas

| Alternativa | Motivo descarte |
|-------------|-----------------|
| GM escribe directo en DB | Imposible auditar y testear |
| Prompt-only sin tools | Modelo alucina acciones |

## Consecuencias

- Lista cerrada de tools extensible por ADR
- Tests de redacción de contexto obligatorios
