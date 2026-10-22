import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateLinkForm } from "@/components/create-link-form";
import { CutDemo } from "@/components/cut-demo";
import { Header } from "@/components/header";
import { LinkRow } from "@/components/link-row";
import { Rich } from "@/components/rich";
import { getT } from "@/i18n/server";
import { currentAnonId, listAnonLinks } from "@/lib/anon";
import { getSession } from "@/lib/auth";
import { shortHost, shortUrl } from "@/lib/links";
import { createAnonLinkAction } from "./actions";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { missing } = await searchParams;
  const session = await getSession();
  if (session && !missing) redirect("/dashboard");

  const [t, anonId] = await Promise.all([getT(), currentAnonId()]);
  const anonLinks = anonId ? await listAnonLinks(anonId) : [];

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pt-16 pb-24 sm:px-6 sm:pt-28">
        {typeof missing === "string" && (
          <p className="mb-8 rounded-full border border-line bg-card px-4 py-1.5 text-center text-sm text-muted">
            <Rich text={t.home.missing(missing)} />
          </p>
        )}

        <h1 className="text-center text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          {t.home.title1}
          <br />
          <span className="text-muted">{t.home.title2}</span>
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-5 max-w-md text-center text-lg text-muted text-balance">{t.home.subtitle}</p>

        <div className="mt-10 w-full max-w-xl">
          <CreateLinkForm action={createAnonLinkAction} host={shortHost} />
        </div>

        {anonLinks.length === 0 ? (
          <div className="mt-14 w-full max-w-xl">
            <CutDemo />
          </div>
        ) : (
          <section className="mt-12 w-full max-w-xl">
            <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
              <h2 className="text-sm font-medium">{t.home.yourLinks}</h2>
              <Link href="/login?mode=signup" className="text-sm text-muted transition hover:text-fg">
                {t.home.saveThem}
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
            <p className="mt-3 px-1 text-xs text-muted">{t.home.perks}</p>
          </section>
        )}

        <section className="mt-24 grid w-full gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {t.home.features.map((f) => (
            <div key={f.title} className="bg-card p-6">
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="py-8 text-center text-sm text-muted">
        cut<span className="text-accent">.</span> — {t.home.footer}
      </footer>
    </>
  );
}
