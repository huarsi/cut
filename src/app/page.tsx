import { redirect } from "next/navigation";
import { CutDemo } from "@/components/cut-demo";
import { Header } from "@/components/header";
import { Scissors } from "@/components/icons";
import { getSession } from "@/lib/auth";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { missing } = await searchParams;
  const session = await getSession();
  if (session && !missing) redirect("/dashboard");

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

        {/* Sin sesión, el dashboard manda a login y regresa con la URL ya escrita. */}
        <form action="/dashboard" className="mt-10 flex w-full max-w-xl gap-2">
          <input
            name="url"
            required
            autoComplete="off"
            placeholder="Pega un link largo…"
            className="input h-13 flex-1 rounded-2xl text-base"
          />
          <button className="btn-primary h-13 rounded-2xl px-5" aria-label="Acortar">
            <Scissors />
            <span className="hidden sm:inline">Cortar</span>
          </button>
        </form>

        <div className="mt-14 w-full max-w-xl">
          <CutDemo />
        </div>

        <section className="mt-24 grid w-full gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          <Feature title="Tu cuenta, tus links" text="Entra con email, GitHub o Google y administra todo en un solo lugar." />
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
