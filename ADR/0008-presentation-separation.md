# ADR-0008: Separación contenido de puzzle y presentación ( físico / digital )

## Estado

Aceptado

## Contexto

Una misma prueba puede mostrarse como pantalla, PDF, QR, audio u objeto doméstico.

## Decisión

`PuzzleDefinition.presentation` referencia medios; lógica en `validation` independiente.

```typescript
export const PresentationRefSchema = z.discriminatedUnion("medium", [
  z.object({ medium: z.literal("digital"), component: z.string() }),
  z.object({ medium: z.literal("printable"), assetId: z.string(), prepNotes: z.string().optional() }),
  z.object({ medium: z.literal("qr"), assetId: z.string(), targetPath: z.string() }),
  z.object({ medium: z.literal("audio"), assetId: z.string() }),
  z.object({ medium: z.literal("physical"), instructions: z.string() }),
]);
```

## Consecuencias

- UI player elige renderer por `medium`
- MVP implementa digital + printable + qr
