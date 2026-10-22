import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Header } from "@/components/header";
import { Rich } from "@/components/rich";
import { getT } from "@/i18n/server";
import { baseUrl } from "@/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.docs };
}

const api = `${baseUrl}/api/v1`;

export default async function DocsPage() {
  const t = await getT();
  const d = t.docs;

  return (
    <>
      <Header />
      {/* Mismo ancho que el resto de páginas; el texto se queda en una columna cómoda de leer. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-14">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">
            API<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-muted">
            {d.intro1}{" "}
            <Link href="/dashboard/keys" className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg">
              {d.panel}
            </Link>{" "}
            <Rich text={d.intro2} />
          </p>

          <Endpoint method="POST" path="/links" title={d.create.title} body={d.create.body}>
            <Block>{`curl -X POST ${api}/links \\
  -H "Authorization: Bearer $CUT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "${d.exampleUrl}", "length": 4}'`}</Block>
            <Block>{`{
  "slug": "k3Rp",
  "shortUrl": "${baseUrl}/k3Rp",
  "url": "${d.exampleUrl}",
  "clicks": 0,
  "createdAt": "2026-10-21T18:00:00.000Z",
  "lastClickedAt": null
}`}</Block>
          </Endpoint>

          <Endpoint method="GET" path="/links" title={d.list.title} body={d.list.body}>
            <Block>{`curl "${api}/links?limit=10" -H "Authorization: Bearer $CUT_API_KEY"`}</Block>
          </Endpoint>

          <Endpoint method="GET" path="/links/:slug" title={d.get.title} body={d.get.body}>
            <Block>{`curl ${api}/links/k3Rp -H "Authorization: Bearer $CUT_API_KEY"`}</Block>
          </Endpoint>

          <Endpoint method="DELETE" path="/links/:slug" title={d.remove.title} body={d.remove.body}>
            <Block>{`curl -X DELETE ${api}/links/k3Rp -H "Authorization: Bearer $CUT_API_KEY"`}</Block>
          </Endpoint>

          <section className="mt-14">
            <h2 className="text-lg font-semibold">JavaScript</h2>
            <Block>{`const res = await fetch("${api}/links", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.CUT_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ url: "https://example.com", slug: "promo" }),
});
const { shortUrl } = await res.json();`}</Block>
          </section>

          <section className="mt-14">
            <h2 className="text-lg font-semibold">{d.errorsTitle}</h2>
            <p className="mt-2 text-muted">
              <Rich text={d.errorsBody} />
            </p>
            <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card text-sm">
              {Object.entries(d.errorRows).map(([code, text]) => (
                <div key={code} className="flex gap-4 px-5 py-3">
                  <dt className="font-mono font-medium">{code}</dt>
                  <dd className="text-muted">{text}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
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
  body,
  children,
}: {
  method: string;
  path: string;
  title: string;
  body: string;
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
      <div className="mt-3 space-y-3 text-muted">
        <p>
          <Rich text={body} />
        </p>
        {children}
      </div>
    </section>
  );
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
