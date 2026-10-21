import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Header } from "@/components/header";
import { baseUrl } from "@/lib/links";

export const metadata: Metadata = { title: "Docs de la API" };

const api = `${baseUrl}/api/v1`;

export default function DocsPage() {
  return (
    <>
      <Header narrow />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-14">
        <h1 className="text-3xl font-semibold tracking-tight">
          API<span className="text-accent">.</span>
        </h1>
        <p className="mt-2 text-muted">
          Genera y administra links desde cualquier lenguaje. Autentícate con una llave que creas en{" "}
          <Link href="/dashboard/keys" className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg">
            tu panel
          </Link>{" "}
          y mándala en el header <Code>Authorization: Bearer cut_…</Code>.
        </p>

        <Endpoint method="POST" path="/links" title="Crear un link">
          <p>
            Cuerpo JSON con <Code>url</Code> y, opcionalmente, <Code>slug</Code> (3–50 caracteres: letras,
            números, <Code>-</Code> o <Code>_</Code>). Responde <Code>201</Code>.
          </p>
          <Block>{`curl -X POST ${api}/links \\
  -H "Authorization: Bearer $CUT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/un/link/largo", "slug": "promo"}'`}</Block>
          <Block>{`{
  "slug": "promo",
  "shortUrl": "${baseUrl}/promo",
  "url": "https://example.com/un/link/largo",
  "clicks": 0,
  "createdAt": "2026-10-21T18:00:00.000Z",
  "lastClickedAt": null
}`}</Block>
        </Endpoint>

        <Endpoint method="GET" path="/links" title="Listar tus links">
          <p>
            Del más nuevo al más viejo. Acepta <Code>?limit=</Code> (1–500, por defecto 50).
          </p>
          <Block>{`curl ${api}/links?limit=10 -H "Authorization: Bearer $CUT_API_KEY"`}</Block>
        </Endpoint>

        <Endpoint method="GET" path="/links/:slug" title="Consultar un link">
          <p>Útil para leer sus clics.</p>
          <Block>{`curl ${api}/links/promo -H "Authorization: Bearer $CUT_API_KEY"`}</Block>
        </Endpoint>

        <Endpoint method="DELETE" path="/links/:slug" title="Borrar un link">
          <p>
            Responde <Code>204</Code> sin cuerpo.
          </p>
          <Block>{`curl -X DELETE ${api}/links/promo -H "Authorization: Bearer $CUT_API_KEY"`}</Block>
        </Endpoint>

        <section className="mt-14">
          <h2 className="text-lg font-semibold">JavaScript</h2>
          <Block>{`const res = await fetch("${api}/links", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.CUT_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ url: "https://example.com" }),
});
const { shortUrl } = await res.json();`}</Block>
        </section>

        <section className="mt-14">
          <h2 className="text-lg font-semibold">Errores</h2>
          <p className="mt-2 text-muted">
            Siempre JSON con la forma <Code>{`{ "error": "mensaje" }`}</Code>.
          </p>
          <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card text-sm">
            {[
              ["400", "URL o alias inválido, o cuerpo mal formado."],
              ["401", "Falta la llave o fue revocada."],
              ["404", "El link no existe o no es tuyo."],
              ["409", "El alias ya está ocupado o reservado."],
            ].map(([code, text]) => (
              <div key={code} className="flex gap-4 px-5 py-3">
                <dt className="font-mono font-medium">{code}</dt>
                <dd className="text-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-fg/5 text-fg",
  POST: "bg-accent/10 text-accent",
  DELETE: "bg-fg text-bg",
};

function Endpoint({
  method,
  path,
  title,
  children,
}: {
  method: string;
  path: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 flex items-center gap-2 font-mono text-sm">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${METHOD_COLORS[method]}`}>{method}</span>
        <span className="text-muted">/api/v1</span>
        <span className="-ml-2">{path}</span>
      </p>
      <div className="mt-3 space-y-3 text-muted">{children}</div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-fg/5 px-1.5 py-0.5 font-mono text-[0.85em] text-fg">{children}</code>;
}

function Block({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-xl border border-line bg-card p-4 pr-12 font-mono text-[13px] leading-relaxed text-fg">
        {children}
      </pre>
      <CopyButton value={children} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" />
    </div>
  );
}
