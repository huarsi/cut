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

1. Importa el repo en Vercel.
2. En **Storage → Marketplace**, conecta **Neon**. Eso crea `DATABASE_URL` (usa la cadena *pooled*).
3. Agrega estas variables de entorno:
   - `BETTER_AUTH_SECRET`: `openssl rand -base64 32`
   - `BETTER_AUTH_URL`: tu dominio público, por ejemplo `https://cut.to`. Se usa también para armar los links cortos.
4. Despliega. El build corre `drizzle-kit migrate` antes de `next build`, así que las tablas se crean solas.

### Login con GitHub o Google (opcional)

Los botones solo aparecen si sus variables están definidas.

| Proveedor | Variables | Callback URL |
| --- | --- | --- |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `https://TU_DOMINIO/api/auth/callback/github` |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `https://TU_DOMINIO/api/auth/callback/google` |

## API

Crea una llave en `/dashboard/keys`. La documentación completa está en `/docs`.

```bash
curl -X POST https://TU_DOMINIO/api/v1/links \
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
