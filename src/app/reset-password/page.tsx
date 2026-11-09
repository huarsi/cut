import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { getT } from "@/i18n/server";
import { ResetForm } from "./reset-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.reset };
}

// Better Auth manda aquí desde el link del correo: con ?token= si es válido, o con ?error=INVALID_TOKEN.
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const t = (await getT()).recovery;

  return (
    <>
      <Header hideSignIn />
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-8 pb-24">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.resetTitle}
            <span className="text-accent">.</span>
          </h1>
          {typeof token === "string" && token ? (
            <>
              <p className="mt-2 mb-6 text-sm text-muted">{t.resetText}</p>
              <ResetForm token={token} />
            </>
          ) : (
            <>
              <p className="mt-2 mb-6 text-sm text-muted">{t.invalidLink}</p>
              <Link href="/forgot-password" className="btn-primary w-full">
                {t.requestNew}
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
