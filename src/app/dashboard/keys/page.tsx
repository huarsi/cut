import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getT } from "@/i18n/server";
import { listApiKeys } from "@/lib/api-keys";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { CreateKeyForm } from "./create-key-form";
import { RevokeButton } from "./revoke-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.keys };
}

export default async function KeysPage() {
  const user = await requireUser("/dashboard/keys");
  const [keys, t, locale] = await Promise.all([listApiKeys(user.id), getT(), getLocale()]);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        API<span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-muted">
        {t.keys.subtitle}{" "}
        <Link href="/docs" className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg">
          {t.keys.docsLink}
        </Link>
      </p>

      <div className="mt-8">
        <CreateKeyForm />
      </div>

      <section className="mt-12">
        {keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-muted">
            {t.keys.empty}
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{k.name}</p>
                  <p className="font-mono text-sm text-muted">{k.prefix}••••••••</p>
                </div>
                <div className="hidden text-right text-xs text-muted sm:block">
                  <p>{t.keys.created(timeAgo(k.createdAt, locale))}</p>
                  <p>{k.lastUsedAt ? t.keys.used(timeAgo(k.lastUsedAt, locale)) : t.keys.neverUsed}</p>
                </div>
                <RevokeButton id={k.id} name={k.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
