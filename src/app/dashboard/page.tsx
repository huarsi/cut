import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateLinkForm } from "@/components/create-link-form";
import { getT } from "@/i18n/server";
import { LinkRow } from "@/components/link-row";
import { countAnonLinks, currentAnonId } from "@/lib/anon";
import { requireUser } from "@/lib/auth";
import { linkStats, listLinks, shortHost, shortUrl } from "@/lib/links";
import { unlimitedStatus } from "@/lib/support";
import { UnlimitedRequest } from "@/components/unlimited-request";
import { createLinkAction } from "./actions";
import { ClaimBanner } from "./claim-banner";
import { UsernamePrompt } from "./username-prompt";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.links };
}

const PAGE_SIZE = 50;

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { url, page: pageParam } = await searchParams;
  const prefill = typeof url === "string" ? url : "";
  const user = await requireUser(prefill ? `/dashboard?url=${encodeURIComponent(prefill)}` : "/dashboard");
  const anonId = await currentAnonId();
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const [t, links, stats, unclaimed, unlimited] = await Promise.all([
    getT(),
    listLinks(user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    linkStats(user.id),
    anonId ? countAnonLinks(anonId) : 0,
    unlimitedStatus(user.id),
  ]);
  const pages = Math.max(1, Math.ceil(stats.links / PAGE_SIZE));
  // Por ejemplo, tras borrar el último link de la última página.
  if (page > pages) redirect(pages === 1 ? "/dashboard" : `/dashboard?page=${pages}`);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        {t.dashboard.hello} {user.displayUsername ?? user.name.split(" ")[0]}
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-muted">{t.dashboard.summary(stats.links, stats.clicks)}</p>

      {!user.username && <UsernamePrompt />}
      {unclaimed > 0 && <ClaimBanner count={unclaimed} />}

      <div className="mt-8">
        <CreateLinkForm
          action={createLinkAction}
          host={shortHost}
          allowSlug
          autoFocus
          defaultUrl={prefill}
          onLimit={<UnlimitedRequest initialStatus={unlimited} />}
        />
      </div>

      <section className="mt-12">
        {stats.links === 0 ? (
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
                lastClickedAt={l.lastClickedAt?.toISOString() ?? null}
                disabled={l.disabledAt !== null}
              />
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav className="mt-4 flex items-center justify-between text-sm">
            <PageLink page={page - 1} disabled={page <= 1}>
              ← {t.dashboard.newer}
            </PageLink>
            <span className="text-muted tabular-nums">{t.dashboard.page(page, pages)}</span>
            <PageLink page={page + 1} disabled={page >= pages}>
              {t.dashboard.older} →
            </PageLink>
          </nav>
        )}
      </section>
    </>
  );
}

function PageLink({ page, disabled, children }: { page: number; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="px-3 py-1.5 text-muted opacity-40">{children}</span>;
  return (
    <Link
      href={page === 1 ? "/dashboard" : `/dashboard?page=${page}`}
      className="rounded-lg px-3 py-1.5 text-muted transition hover:bg-fg/5 hover:text-fg"
    >
      {children}
    </Link>
  );
}
