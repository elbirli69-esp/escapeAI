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
| `SESSION_DATA_DIR` | opcional `/tmp/escapeai-sessions` | Por defecto en Vercel ya usa `/tmp` (best-effort; no compartido entre instancias) |
| `OPENAI_API_KEY` | opcional | Narración con IA |
| `OPENAI_MODEL` | opcional | p. ej. `gpt-4o-mini` |
| `CORS_ORIGINS` | opcional | Solo si usas otro dominio custom además del de Vercel |

Vercel inyecta `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL`; la API los usa para CORS.

## 3. Dominio custom y acceso público

Proyecto creado en el **mismo equipo Vercel** que `traveltoblog` (StorIAteller).

URLs actuales de producción:

- https://escapeai-rodrigo-cv.vercel.app
- https://escapeai-self.vercel.app

**SSO / Deployment Protection:** si el equipo tiene *Vercel Authentication* en `*.vercel.app` (como en otros proyectos del team), los visitantes anónimos no verán la app hasta que añadas un **dominio custom** o desactives la protección en **Project → Settings → Deployment Protection** para Production.

Igual que StorIAteller: **Settings → Domains** → tu dominio + `CORS_ORIGINS=https://tudominio.com` si aplica.

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

## 6. Limitaciones actuales (MVP)

- **Sesiones:** en serverless, la persistencia en `/tmp` no es fiable a largo plazo ni entre regiones. Siguiente paso: **Vercel KV**, **Upstash Redis** o **Neon Postgres**.
- **Cold starts:** primera petición puede tardar un poco tras inactividad.

## 7. Dos proyectos (alternativa)

Si prefieres API y web separadas (como algunos monorepos con backend en Render):

- Proyecto A: solo `apps/web`, `VITE_API_BASE=https://api.tudominio.com`
- Proyecto B: solo functions API

Para escapeAI el **proyecto único** es el recomendado (menos CORS y un solo preview por PR).
