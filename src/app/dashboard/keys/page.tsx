import type { Metadata } from "next";
import Link from "next/link";
import { listApiKeys } from "@/lib/api-keys";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { CreateKeyForm } from "./create-key-form";
import { RevokeButton } from "./revoke-button";

export const metadata: Metadata = { title: "API" };

export default async function KeysPage() {
  const user = await requireUser("/dashboard/keys");
  const keys = await listApiKeys(user.id);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        API<span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-muted">
        Crea llaves para generar links desde tus scripts.{" "}
        <Link href="/docs" className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg">
          Ver documentación
        </Link>
      </p>

      <div className="mt-8">
        <CreateKeyForm />
      </div>

      <section className="mt-12">
        {keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-muted">
            Sin llaves todavía.
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
                  <p>Creada {timeAgo(k.createdAt)}</p>
                  <p>{k.lastUsedAt ? `Usada ${timeAgo(k.lastUsedAt)}` : "Nunca usada"}</p>
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
