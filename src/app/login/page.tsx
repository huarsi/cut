import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { getT } from "@/i18n/server";
import { enabledProviders, getSession } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.login };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, mode } = await searchParams;
  // Solo rutas internas, para no convertir el login en un redirect abierto.
  const target = typeof next === "string" && /^\/(?!\/)/.test(next) ? next : "/dashboard";

  if (await getSession()) redirect(target);

  return (
    <>
      <Header hideSignIn />
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-8 pb-24">
        <div className="w-full max-w-sm">
          <AuthForm
            next={target}
            providers={enabledProviders}
            initialMode={mode === "signup" ? "signup" : "signin"}
          />
        </div>
      </main>
    </>
  );
}
