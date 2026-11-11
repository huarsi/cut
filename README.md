# cut.

Acortador de links con cuentas de usuario, conteo de clics y API REST con llaves.

- **Sin cuenta:** cualquiera puede acortar desde la landing (máximo 15 links por IP por hora). Los links quedan ligados a una cookie del navegador.
- **Con cuenta:** registro con usuario y correo, login con cualquiera de los dos, alias personalizados, cambiar el destino de un link y borrarlo. Al entrar, el panel ofrece pasar a tu cuenta los links que ese navegador creó sin cuenta; solo se mueven los que aún no tienen dueño.
- **Cuenta (`/dashboard/settings`):** cambiar usuario y contraseña, y borrar la cuenta con todos sus links y llaves. Recuperación de contraseña por correo.
- **Clics reales:** solo cuentan las visitas de personas; los bots, buscadores, vistas previas de chats (WhatsApp, Slack…) y peticiones `HEAD` no suman.
- **Largo del código:** al acortar se puede elegir de 3 a 7 caracteres después de la `/` (5 por defecto). Los alias personalizados aceptan hasta 100.
- **Límite por cuenta:** 300 links por hora y 3,000 por día, sumando panel y API (`LINKS_PER_HOUR`, `LINKS_PER_DAY`). Al llegar al límite, el usuario puede pedir una **cuenta ilimitada** (ver [Moderación](#moderación)).
- **Contra abuso:** no se aceptan links a otros acortadores ni a dominios bloqueados (`BLOCKED_DOMAINS` o desde el portal), y con `GOOGLE_SAFE_BROWSING_KEY` cada link nuevo se revisa contra Google Safe Browsing. El login tiene límite de intentos guardado en la base (tabla `rate_limit`).
- **Reportes:** cualquiera puede reportar un link en `/report` (máximo 5 por hora por IP) y dejar su correo, opcional, para saber el resultado.
- **API:** requiere cuenta; se usa con llaves que se crean en el panel.
- **Temas e idiomas:** Sistema, Claro, Oscuro, Navy y Fun; español, inglés y portugués. Ambos se eligen en el menú del header y se guardan en cookies (`cut_theme`, `cut_lang`). Los nombres propios y marcas no se traducen.
- **Detalles:** ícono de tijeras naranjas, imagen para compartir en redes (`opengraph-image.tsx`), páginas propias de 404 y de error, diálogos de confirmación propios y `robots.txt`/`sitemap.xml`.

**Stack:** Next.js 16 · React 19 · Tailwind 4 · Better Auth · Drizzle + Postgres (Neon) · Resend · Motion · Vitest

## Moderación

El portal `/admin` solo lo ven los correos de `ADMIN_EMAILS`; para cualquier otra persona responde 404, como si no existiera. Además, cada moderador debe **confirmar su correo** la primera vez (el portal le manda el link), para que nadie entre registrando antes un correo de la lista. A los usuarios normales no se les pide confirmar. Está solo en español.

- **Reportes:** con el primer reporte pendiente de cada link llega un correo a `ADMIN_EMAILS`. Desde el portal se desactiva el link, se bloquea su dominio (y subdominios) o se descarta el reporte. También se pueden reactivar links y desbloquear dominios.
- **Responder a quien reportó:** si dejó su correo, al resolver se le avisa automáticamente del resultado, en el idioma en que reportó; la casilla se puede desmarcar para no mandar nada. También se le puede escribir a mano con "Responder": si contesta, la respuesta le llega a quien moderó (ve ese correo). A quien ya se le respondió a mano no se le manda además el aviso automático. El historial muestra a quién se avisó y qué se le escribió.
- **Cuentas ilimitadas:** las solicitudes llegan por correo y se aprueban o rechazan en la pestaña Cuentas, donde también se puede dar o quitar ilimitado a cualquier cuenta. El usuario recibe la respuesta por correo en su idioma.

## Desarrollo local

```bash
cp .env.example .env          # y llena BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d          # Postgres local en el puerto 5433
npm run db:migrate
npm run dev
```

Sin `RESEND_API_KEY`, los correos se imprimen en la terminal en vez de enviarse.

Si cambias `src/db/schema.ts`, genera la migración con `npm run db:generate` y súbela junto con el cambio. Las migraciones deben solo **agregar** (tablas, columnas, índices): nunca borrar ni renombrar, porque producción tiene datos.

## Pruebas

```bash
npm test          # una vez
npm run test:watch
```

Usan [Vitest](https://vitest.dev) y una base aparte, `cut_test`, en el mismo Postgres de `docker compose` (se crea y se migra sola; nunca toca la de desarrollo). Cubren las reglas de URLs y bloqueos, quién puede moderar, la detección de bots, los límites por cuenta y sin cuenta, reclamar links anónimos, reportes, avisos a quien reporta, moderación, cuentas ilimitadas y la API. No mandan correos reales. En GitHub corren en cada push y pull request, junto con TypeScript y ESLint (`.github/workflows/ci.yml`).

## Deploy en Vercel

1. Importa el repo en Vercel y agrega `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). El primer deploy falla porque aún no hay base de datos; es normal.
2. En el proyecto, **Storage → Create Database → Neon** y conéctala. Eso crea `DATABASE_URL`.
3. **Deployments → ⋯ → Redeploy.** El build de producción corre las migraciones antes de `next build`, así que las tablas se crean solas. Los builds de preview (`VERCEL_ENV=preview`) no migran, para que una rama sin revisar nunca toque la base de producción.
4. Cuando conectes un dominio propio, define `BETTER_AUTH_URL` con él (`https://cut.lat`) y vuelve a desplegar. Sin ella se usa el dominio `*.vercel.app` de producción, también para armar los links cortos. El login funciona también en las URLs de cada deploy y de cada rama.

### Variables de entorno

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Postgres (Neon la crea sola en Vercel) |
| `BETTER_AUTH_SECRET` | Firma de sesiones |
| `BETTER_AUTH_URL` | Dominio público, p. ej. `https://cut.lat` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Correos (p. ej. `cut. <no-reply@cut.lat>`). La llave basta con permiso de envío y el dominio verificado en [Resend](https://resend.com). Sin ellas, en producción no aparece "¿Olvidaste tu contraseña?" y no salen avisos |
| `ADMIN_EMAILS` | Correos de quienes moderan, separados por comas |
| `LINKS_PER_HOUR`, `LINKS_PER_DAY` | Límite por cuenta (opcional; 300 y 3000) |
| `BLOCKED_DOMAINS` | Dominios bloqueados fijos, separados por comas (opcional) |
| `GOOGLE_SAFE_BROWSING_KEY` | Revisar links nuevos con Google Safe Browsing (opcional) |

Los correos que manda cut.: recuperar contraseña, confirmar el correo de quien modera, avisos de reportes y solicitudes a `ADMIN_EMAILS`, la respuesta a una solicitud de cuenta ilimitada y el resultado de un reporte a quien lo hizo.

### Login con GitHub o Google (apagado)

No se usa por ahora. El código está listo pero apagado: los botones solo aparecerían si se definen `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` o `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (callback `https://cut.lat/api/auth/callback/github` o `/google`).

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

Cada link viene con `shortUrl` (`https://cut.lat/promo`, para usarlo como link) y `short` (`cut.lat/promo`, para mostrarlo o mandarlo en un mensaje).

Si la cuenta llega a su límite, responde `429`.

## Estructura

```
src/
  app/
    [slug]/route.ts         redirección + conteo de clics
    api/v1/links/           API REST
    api/auth/[...all]/      Better Auth
    dashboard/              panel de links, llaves y cuenta (server actions en actions.ts)
    admin/                  portal de moderación (solo ADMIN_EMAILS)
    report/                 formulario público para reportar links
    docs/  login/  forgot-password/  reset-password/
    not-found.tsx  error.tsx  global-error.tsx
    icon.svg  favicon.ico  apple-icon.png  opengraph-image.tsx  robots.ts  sitemap.ts
  components/               UI compartida (header, formularios, diálogo de confirmación…)
  i18n/dictionaries/        textos en es, en y pt
  db/schema.ts              tablas: auth, link, api_key, rate_limit, report, blocked_domain, support_ticket
  lib/links.ts              validación de URLs, slugs, límites y CRUD
  lib/api-keys.ts           llaves: se guarda solo el hash SHA-256
  lib/safety.ts             dominios bloqueados y Google Safe Browsing
  lib/reports.ts            reportes, avisos y acciones de moderación
  lib/support.ts            solicitudes de cuenta ilimitada
  lib/bots.ts               qué visitas no cuentan como clic
  lib/email.ts              correos con Resend (plantilla con el logo)
drizzle/                    migraciones (solo agregan)
scripts/migrate.mjs         migraciones en el build (se omiten en previews)
tests/                      pruebas (unit/ sin base; db/ con la base cut_test)
assets/                     fuente de la imagen para compartir (Geist, licencia OFL)
```
