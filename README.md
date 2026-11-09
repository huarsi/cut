# cut.

Acortador de links con cuentas de usuario, conteo de clics y API REST con llaves.

- **Sin cuenta:** cualquiera puede acortar desde la landing (máximo 15 links por IP por hora). Los links quedan ligados a una cookie del navegador.
- **Con cuenta:** registro con usuario y correo, login con cualquiera de los dos, alias personalizados, cambiar el destino de un link y borrarlo. Al entrar, el panel ofrece pasar a tu cuenta los links que ese navegador creó sin cuenta; solo se mueven los que aún no tienen dueño.
- **Cuenta (`/dashboard/settings`):** cambiar usuario y contraseña, y borrar la cuenta con todos sus links y llaves. Recuperación de contraseña por correo (Resend).
- **Clics reales:** solo cuentan las visitas de personas; los bots, buscadores, vistas previas de chats (WhatsApp, Slack…) y peticiones `HEAD` no suman.
- **Contra abuso:** no se aceptan links a otros acortadores ni a dominios bloqueados (`BLOCKED_DOMAINS` o desde el portal), y con `GOOGLE_SAFE_BROWSING_KEY` cada link nuevo se revisa contra Google Safe Browsing. El login tiene límite de intentos guardado en la base (tabla `rate_limit`).
- **Reportes y moderación:** cualquiera puede reportar un link en `/report` (máximo 5 por hora por IP). Con el primer reporte pendiente de cada link llega un correo a `ADMIN_EMAILS`. En `/admin` (solo para esos correos; para el resto responde 404) se desactiva el link, se bloquea su dominio o se descarta el reporte, y se pueden reactivar links y desbloquear dominios.
- **Largo del código:** al acortar se puede elegir de 3 a 7 caracteres después de la `/` (5 por defecto). Los alias personalizados aceptan hasta 100.
- **API:** requiere cuenta; se usa con llaves que se crean en el panel.
- **Límite por cuenta:** 300 links por hora y 3,000 por día, sumando panel y API (`LINKS_PER_HOUR`, `LINKS_PER_DAY`). Al llegar al límite, el usuario puede pedir una **cuenta ilimitada**; la solicitud llega por correo a `ADMIN_EMAILS` y se aprueba o rechaza en `/admin` → Cuentas, donde también se puede dar o quitar ilimitado a cualquier cuenta. El usuario recibe la respuesta por correo en su idioma.
- **Temas e idiomas:** Sistema, Claro, Oscuro, Navy y Fun; español, inglés y portugués. Ambos se eligen en el menú del header y se guardan en cookies (`cut_theme`, `cut_lang`).

**Stack:** Next.js 16 · Tailwind 4 · Better Auth · Drizzle + Postgres (Neon) · Motion

## Desarrollo local

```bash
cp .env.example .env          # y llena BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d          # Postgres local en el puerto 5433
npm run db:migrate
npm run dev
```

Si cambias `src/db/schema.ts`, genera la migración con `npm run db:generate` y súbela junto con el cambio.

## Pruebas

```bash
npm test          # una vez
npm run test:watch
```

Usan [Vitest](https://vitest.dev) y una base aparte, `cut_test`, en el mismo Postgres de `docker compose` (se crea y se migra sola; nunca toca la de desarrollo). Cubren las reglas de URLs y bloqueos, la detección de bots, los límites por cuenta y sin cuenta, reclamar links anónimos, reportes y moderación, cuentas ilimitadas y la API. En GitHub corren en cada push y pull request, junto con TypeScript y ESLint (`.github/workflows/ci.yml`).

## Deploy en Vercel

1. Importa el repo en Vercel y agrega `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). El primer deploy falla porque aún no hay base de datos; es normal.
2. En el proyecto, **Storage → Create Database → Neon** y conéctala. Eso crea `DATABASE_URL`.
3. **Deployments → ⋯ → Redeploy.** El build de producción corre las migraciones antes de `next build`, así que las tablas se crean solas. Los builds de preview (`VERCEL_ENV=preview`) no migran, para que una rama sin revisar nunca toque la base de producción. Las migraciones solo agregan lo que falta; no borran datos.
4. Cuando conectes un dominio propio, define `BETTER_AUTH_URL` con él (`https://cut.lat`) y vuelve a desplegar. Sin ella se usa el dominio `*.vercel.app` de producción, también para armar los links cortos.

### Correos (recuperar contraseña)

Crea una llave en [Resend](https://resend.com), verifica tu dominio y define `RESEND_API_KEY` y `EMAIL_FROM` (por ejemplo `cut. <no-reply@cut.lat>`). Sin ellas, en producción no aparece "¿Olvidaste tu contraseña?".

### Moderación

Define `ADMIN_EMAILS` con tu correo (o varios, separados por comas). Con ese correo verás "Moderación" en el menú y recibirás los avisos de reportes (requiere Resend).

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
| `POST` | `/api/v1/links` | Crea un link (`url`; opcionales `slug` o `length` de 3 a 7) |
| `GET` | `/api/v1/links?limit=50` | Lista tus links |
| `GET` | `/api/v1/links/:slug` | Consulta un link y sus clics |
| `PATCH` | `/api/v1/links/:slug` | Cambia el destino (`url`); conserva slug y clics |
| `DELETE` | `/api/v1/links/:slug` | Borra un link |

## Estructura

```
src/
  app/
    [slug]/route.ts         redirección + conteo de clics
    api/v1/links/           API REST
    api/auth/[...all]/      Better Auth
    dashboard/              panel de links y llaves (server actions en actions.ts)
    admin/                  portal de moderación (solo ADMIN_EMAILS)
    report/                 formulario público para reportar links
    docs/  login/  forgot-password/  reset-password/
  db/schema.ts              tablas (auth + link + api_key)
  lib/links.ts              validación de URLs, slugs y CRUD
  lib/api-keys.ts           llaves: se guarda solo el hash SHA-256
  lib/safety.ts             dominios bloqueados y Google Safe Browsing
  lib/reports.ts            reportes, avisos y acciones de moderación
  lib/support.ts            solicitudes de cuenta ilimitada
  lib/bots.ts               qué visitas no cuentan como clic
  lib/email.ts              correos con Resend
scripts/migrate.mjs         migraciones en el build (se omiten en previews)
tests/                      pruebas (unit/ sin base; db/ con la base cut_test)
assets/                     fuente de la imagen para compartir (Geist, licencia OFL)
```
