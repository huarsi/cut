# cut.

Acortador de links con cuentas de usuario, conteo de clics y API REST con llaves.

**Stack:** Next.js 16 · Tailwind 4 · Better Auth · Drizzle + Postgres (Neon) · Motion

## Desarrollo local

```bash
cp .env.example .env          # y llena BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d          # Postgres local en el puerto 5433
npm run db:migrate
npm run dev
```

Si cambias `src/db/schema.ts`, genera la migración con `npm run db:generate` y súbela junto con el cambio.

## Deploy en Vercel

1. Importa el repo en Vercel y agrega `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). El primer deploy falla porque aún no hay base de datos; es normal.
2. En el proyecto, **Storage → Create Database → Neon** y conéctala. Eso crea `DATABASE_URL`.
3. **Deployments → ⋯ → Redeploy.** El build corre `drizzle-kit migrate` antes de `next build`, así que las tablas se crean solas.
4. Cuando conectes un dominio propio, define `BETTER_AUTH_URL` con él (`https://cut.lat`) y vuelve a desplegar. Sin ella se usa el dominio `*.vercel.app` de producción, también para armar los links cortos.

### Login con GitHub o Google (opcional)

Los botones solo aparecen si sus variables están definidas.

| Proveedor | Variables | Callback URL |
| --- | --- | --- |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `https://cut.lat/api/auth/callback/github` |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `https://cut.lat/api/auth/callback/google` |

## API

Crea una llave en `/dashboard/keys`. La documentación completa está en `/docs`.

```bash
curl -X POST https://cut.lat/api/v1/links \
  -H "Authorization: Bearer $CUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/un/link/largo", "slug": "promo"}'
```

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `POST` | `/api/v1/links` | Crea un link (`url`, `slug` opcional) |
| `GET` | `/api/v1/links?limit=50` | Lista tus links |
| `GET` | `/api/v1/links/:slug` | Consulta un link y sus clics |
| `DELETE` | `/api/v1/links/:slug` | Borra un link |

## Estructura

```
src/
  app/
    [slug]/route.ts         redirección + conteo de clics
    api/v1/links/           API REST
    api/auth/[...all]/      Better Auth
    dashboard/              panel de links y llaves (server actions en actions.ts)
    docs/  login/
  db/schema.ts              tablas (auth + link + api_key)
  lib/links.ts              validación de URLs, slugs y CRUD
  lib/api-keys.ts           llaves: se guarda solo el hash SHA-256
```
