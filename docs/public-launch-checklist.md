# Checklist: acceso público + sesiones en producción

Usa esta lista antes de compartir escapeAI fuera del equipo (misma línea que StorIAteller / traveltoblog).

## A. Upstash Redis (sesiones)

1. Vercel → proyecto **escapeai** → **Storage** → **Create Database** → **Upstash Redis** (o conecta una existente).
2. Vincula la base al proyecto (sin custom prefix). Vercel suele crear:
   - `KV_REST_API_URL` y `KV_REST_API_TOKEN` (nombres actuales), o
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` si vienen de consola Upstash
3. (Opcional) `SESSION_TTL_SEC` — por defecto **172800** (48 h). Debe cubrir `timeLimitSec` de la sala + margen.
4. Redeploy **Production** tras guardar variables.
5. Comprueba: `GET /api/health` → `"persistence": "redis"`.

**Local:** copia las mismas variables en `.env` en la raíz o exporta antes de `pnpm dev:api`.

## B. UI (sin sorpresas al jugar)

- Errores de puzzle en **banner** en pantalla (no `alert`).
- Badge **Narrador IA** cuando la última respuesta del orquestador viene de OpenAI.

## C. Acceso público (dominio o SSO)

El equipo **Rodrigo** puede tener **Deployment Protection** con SSO en `*.vercel.app` (`all_except_custom_domains`). Los visitantes sin cuenta Vercel ven *Protected by Vercel Authentication*.

### Opción C1 — Dominio custom (recomendado, como storiateller.com)

1. **Project → Settings → Domains** → Add `escapeai.tudominio.com` (o apex).
2. Configura DNS según instrucciones Vercel (A/CNAME).
3. **Settings → Environment Variables** → `CORS_ORIGINS=https://escapeai.tudominio.com` (y `www.` si aplica).
4. Espera SSL activo y prueba en móvil + “Añadir a pantalla de inicio”.

### Opción C2 — Sin dominio propio aún

1. **Project → Settings → Deployment Protection**
2. En **Production**, desactiva *Vercel Authentication* / SSO **solo para este proyecto** (los previews pueden seguir protegidos).
3. Confirma en ventana de incógnito: `https://escapeai-rodrigo-cv.vercel.app/` carga el selector de salas.

## D. Orquestador IA (opcional)

1. `OPENAI_API_KEY` en Production (+ Preview si quieres probar en PR).
2. `OPENAI_MODEL=gpt-4o-mini` (u otro).
3. Prueba: falla un puzzle y revisa una frase de narración en el diario + badge IA.

## E. Smoke test final

| Paso | Esperado |
| ---- | -------- |
| Abrir `/` en incógnito | Selector de 2 salas |
| Empezar partida | Diario con texto de entrada |
| Fallar un puzzle | Banner de error, línea en diario |
| Recargar página (F5) | **Misma sesión** (solo con Redis) |
| Completar sala piloto | Pantalla victoria |

## F. Después del lanzamiento

- Monitorear **Runtime Logs** en Vercel si hay 5xx en `/api`.
- Siguiente mejora: dominio de marca + iconos PWA 192/512 para stores (Capacitor).
