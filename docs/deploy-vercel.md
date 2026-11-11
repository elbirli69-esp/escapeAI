# Desplegar escapeAI en Vercel

Mismo patrón que otras apps Vite + API en un **solo proyecto Vercel**: la PWA se sirve como estáticos y la API Hono como **Serverless Function** en `/api/*`.

## Arquitectura en Vercel

| Ruta | Qué es |
| ---- | ------ |
| `/`, `/assets/*` | Build de `apps/web` (`apps/web/dist`) |
| `/api/*` | `api/index.ts` → Hono (`apps/api` compilado) |

`vercel.json` en la raíz define `buildCommand`, `outputDirectory` y rewrites SPA.

## 1. Importar desde GitHub

1. [Vercel Dashboard](https://vercel.com/new) → **Add New Project**
2. Repositorio **`elbirli69-esp/escapeAI`**
3. **Framework Preset:** Other (usa `vercel.json`)
4. Root Directory: **`.`** (raíz del repo)
5. Deploy (preview)

No hace falta cambiar Build/Output: ya vienen en `vercel.json`.

## 2. Variables de entorno

En **Project → Settings → Environment Variables**:

| Variable | Preview + Production | Notas |
| -------- | -------------------- | ----- |
| `UPSTASH_REDIS_REST_URL` | **recomendado** | Vercel → Storage → Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | **recomendado** | Se crea al vincular la base |
| `SESSION_TTL_SEC` | opcional | Por defecto `172800` (48 h) |
| `SESSION_DATA_DIR` | solo local | Carpeta JSON en desarrollo |
| `OPENAI_API_KEY` | opcional | Narración con IA |
| `OPENAI_MODEL` | opcional | p. ej. `gpt-4o-mini` |
| `CORS_ORIGINS` | opcional | Dominio custom adicional |

Vercel inyecta `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL`; la API los usa para CORS.

## 3. Dominio custom y acceso público

Proyecto creado en el **mismo equipo Vercel** que `traveltoblog` (StorIAteller).

URLs actuales de producción:

- https://escapeai-rodrigo-cv.vercel.app
- https://escapeai-self.vercel.app

**SSO / Deployment Protection:** en el proyecto **escapeai**, Production ya está **pública** en `*.vercel.app` (solo los **previews** de PR siguen con Vercel Authentication). Otros proyectos del equipo, como StorIAteller, pueden seguir protegidos hasta tener dominio propio.

Si creas un dominio custom en escapeai: **Settings → Domains** + `CORS_ORIGINS=https://tudominio.com` si aplica.

**Upstash Redis:** [Storage del proyecto](https://vercel.com/rodrigo-cv/escapeai/stores) → **Upstash Redis** → vincular → redeploy. Comprueba `GET /api/health` → `"persistence": "redis"`.

## 4. Comprobar el deploy

```text
GET https://<tu-proyecto>.vercel.app/api/health
GET https://<tu-proyecto>.vercel.app/api/rooms
```

La PWA en `/` debe listar salas y crear sesión contra `/api/sessions`.

## 5. Desarrollo local alineado con producción

```bash
pnpm dev          # web :5173, API :8787, rutas bajo /api
```

Para probar el empaquetado Vercel:

```bash
pnpm build
vercel dev        # requiere Vercel CLI y login
```

## 6. Checklist de lanzamiento

Ver [public-launch-checklist.md](./public-launch-checklist.md) (Redis + dominio/SSO + smoke tests).

## 7. Limitaciones actuales (MVP)

- Sin Upstash: fallback a `/tmp` o memoria (no fiable entre recargas en prod).
- **Cold starts:** primera petición puede tardar un poco tras inactividad.

## 8. Dos proyectos (alternativa)

Si prefieres API y web separadas (como algunos monorepos con backend en Render):

- Proyecto A: solo `apps/web`, `VITE_API_BASE=https://api.tudominio.com`
- Proyecto B: solo functions API

Para escapeAI el **proyecto único** es el recomendado (menos CORS y un solo preview por PR).
