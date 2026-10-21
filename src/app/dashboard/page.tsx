import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listLinks, shortUrl } from "@/lib/links";
import { CreateLinkForm } from "./create-link-form";
import { LinkRow } from "./link-row";

export const metadata: Metadata = { title: "Links" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { url } = await searchParams;
  const prefill = typeof url === "string" ? url : "";
  const user = await requireUser(prefill ? `/dashboard?url=${encodeURIComponent(prefill)}` : "/dashboard");
  const links = await listLinks(user.id);
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        Hola, {user.name.split(" ")[0]}
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-muted">
        {links.length} {links.length === 1 ? "link" : "links"} · {totalClicks}{" "}
        {totalClicks === 1 ? "clic" : "clics"}
      </p>

      <div className="mt-8">
        <CreateLinkForm defaultUrl={prefill} />
      </div>

      <section className="mt-12">
        {links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-muted">
            Aún no tienes links. Pega uno arriba para empezar.
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
