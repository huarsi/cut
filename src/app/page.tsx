import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateLinkForm } from "@/components/create-link-form";
import { CutDemo } from "@/components/cut-demo";
import { Header } from "@/components/header";
import { LinkRow } from "@/components/link-row";
import { currentAnonId, listAnonLinks } from "@/lib/anon";
import { getSession } from "@/lib/auth";
import { shortUrl } from "@/lib/links";
import { createAnonLinkAction } from "./actions";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { missing } = await searchParams;
  const session = await getSession();
  if (session && !missing) redirect("/dashboard");

  const anonId = await currentAnonId();
  const anonLinks = anonId ? await listAnonLinks(anonId) : [];

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pt-16 pb-24 sm:px-6 sm:pt-28">
        {missing && (
          <p className="mb-8 rounded-full border border-line bg-card px-4 py-1.5 text-sm text-muted">
            El link <span className="font-mono text-fg">/{missing}</span> no existe o fue borrado.
          </p>
        )}

        <h1 className="text-center text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Links largos,
          <br />
          <span className="text-muted">cortados</span>
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-5 max-w-md text-center text-lg text-muted text-balance">
          Acorta, comparte y mide tus links. O genéralos desde tu código con una API.
        </p>

        <div className="mt-10 w-full max-w-xl">
          <CreateLinkForm action={createAnonLinkAction} />
        </div>

        {anonLinks.length === 0 ? (
          <div className="mt-14 w-full max-w-xl">
            <CutDemo />
          </div>
        ) : (
          <section className="mt-12 w-full max-w-xl">
            <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
              <h2 className="text-sm font-medium">Tus links en este navegador</h2>
              <Link href="/login?mode=signup" className="text-sm text-muted transition hover:text-fg">
                Guárdalos en una cuenta →
              </Link>
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {anonLinks.map((l) => (
                <LinkRow
                  key={l.id}
                  slug={l.slug}
                  url={l.url}
                  shortUrl={shortUrl(l.slug)}
                  clicks={l.clicks}
                  createdAt={l.createdAt.toISOString()}
                  deletable={false}
                />
              ))}
            </ul>
            <p className="mt-3 px-1 text-xs text-muted">
              Con una cuenta puedes usar alias personalizados, borrar links y generarlos con la API.
            </p>
          </section>
        )}

        <section className="mt-24 grid w-full gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          <Feature title="Sin cuenta, al instante" text="Corta un link en un segundo. Si luego te registras, te los llevas a tu cuenta." />
          <Feature title="Clics en tiempo real" text="Cada link cuenta sus visitas y te dice cuándo fue la última." />
          <Feature title="API para automatizar" text="Crea llaves y genera links desde cualquier script con un POST." />
        </section>
      </main>
      <footer className="py-8 text-center text-sm text-muted">
        cut<span className="text-accent">.</span> — hecho para compartir menos caracteres.
      </footer>
    </>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-card p-6">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
