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

## Scripts

| Comando      | Descripción                    |
| ------------ | ------------------------------ |
| `pnpm dev`   | API + web en paralelo          |
| `pnpm build` | Build de todos los paquetes    |
| `pnpm test`  | Tests (motor + sala piloto)    |

## Documentación

Ver [docs/architecture.md](./docs/architecture.md).
