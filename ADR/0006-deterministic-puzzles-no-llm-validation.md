# ADR-0006: Validación determinista de puzzles (sin LLM)

## Estado

Aceptado

## Contexto

Coste, latencia, seguridad (solución) y reproducibilidad en tests.

## Decisión

Toda resolución mecánica pasa por `ValidationStrategy` en el motor. LLM solo para flavor (GM) o generación offline (Creator).

Interrogatorios: keywords/reglas registradas; LLM no decide `solved`.

## Alternativas

| Alternativa | Motivo descarte |
|-------------|-----------------|
| LLM judge “¿es correcta esta respuesta?” | No determinista; filtraciones |
| Hybrid por puzzle | Excepciones difíciles de testear |

## Consecuencias

- Diseño de puzzles debe ser machine-checkable
- Creator debe generar validation blocks estructurados
