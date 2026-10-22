import type { Metadata } from "next";
import { CreateLinkForm } from "@/components/create-link-form";
import { getT } from "@/i18n/server";
import { LinkRow } from "@/components/link-row";
import { countAnonLinks, currentAnonId } from "@/lib/anon";
import { requireUser } from "@/lib/auth";
import { listLinks, shortHost, shortUrl } from "@/lib/links";
import { createLinkAction } from "./actions";
import { ClaimBanner } from "./claim-banner";
import { UsernamePrompt } from "./username-prompt";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.links };
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { url } = await searchParams;
  const prefill = typeof url === "string" ? url : "";
  const user = await requireUser(prefill ? `/dashboard?url=${encodeURIComponent(prefill)}` : "/dashboard");
  const anonId = await currentAnonId();
  const [t, links, unclaimed] = await Promise.all([
    getT(),
    listLinks(user.id),
    anonId ? countAnonLinks(anonId) : 0,
  ]);
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        {t.dashboard.hello} {user.displayUsername ?? user.name.split(" ")[0]}
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-muted">{t.dashboard.summary(links.length, totalClicks)}</p>

      {!user.username && <UsernamePrompt />}
      {unclaimed > 0 && <ClaimBanner count={unclaimed} />}

      <div className="mt-8">
        <CreateLinkForm action={createLinkAction} host={shortHost} allowSlug autoFocus defaultUrl={prefill} />
      </div>

      <section className="mt-12">
        {links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-muted">
            {t.dashboard.empty}
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {links.map((l) => (
              <LinkRow
                key={l.id}
                slug={l.slug}
                url={l.url}
                shortUrl={shortUrl(l.slug)}
                clicks={l.clicks}
                createdAt={l.createdAt.toISOString()}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
