# escapeAI

Escape rooms online con orquestador de IA (en desarrollo). Stack: **pnpm monorepo**, **Vite PWA**, **Hono API**, motor **TypeScript** en servidor.

## Requisitos

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+

## Desarrollo

```bash
pnpm install
pnpm build
pnpm test
pnpm dev
```

- API: http://localhost:8787
- Web (PWA): http://localhost:5173 (proxy `/api` → API)

### Variables de entorno (API)

| Variable | Descripción |
| -------- | ----------- |
| `SESSION_DATA_DIR` | Carpeta para guardar sesiones JSON (p. ej. `./data/sessions`) |
| `OPENAI_API_KEY` | Activa narración con modelo OpenAI |
| `OPENAI_MODEL` | Opcional, por defecto `gpt-4o-mini` |
| `CORS_ORIGINS` | Orígenes permitidos separados por coma |

## Scripts

| Comando      | Descripción                    |
| ------------ | ------------------------------ |
| `pnpm dev`   | API + web en paralelo          |
| `pnpm build` | Build de todos los paquetes    |
| `pnpm test`  | Tests (motor + sala piloto)    |
| `pnpm test:e2e` | Playwright (API + PWA)      |

## Documentación

- [Arquitectura](./docs/architecture.md)
- [GameMasterAI — GM-0](./docs/gamemaster-ai-gm0.md)
- [GameMasterAI — GM-1](./docs/gamemaster-ai-gm1.md)
- [Plan UX/UI visual por tema](./docs/prompt-ux-ui-temas-visuales.md)
- [Sensory escape room v3 (pistas hiladas)](./docs/prompt-sensory-escape-room-v3.md)
- [Entretenimiento ER (narrativa, ritmo, arquitectura)](./docs/prompt-entretenimiento-er.md)
- [Diseñar salas (YAML)](./docs/authoring-rooms.md)
- [Despliegue en Vercel](./docs/deploy-vercel.md)
- [Checklist lanzamiento público](./docs/public-launch-checklist.md)

```bash
pnpm validate-rooms   # comprobar YAML antes de commit
pnpm audit-coherence  # coherencia narrativa/mecánica entre tipos de partida (ver docs/prompt-coherencia-partidas.md)
```
