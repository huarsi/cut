import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { enabledProviders, getSession } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, mode } = await searchParams;
  // Solo rutas internas, para no convertir el login en un redirect abierto.
  const target = typeof next === "string" && /^\/(?!\/)/.test(next) ? next : "/dashboard";

  if (await getSession()) redirect(target);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Logo />
        </div>
        <AuthForm
          next={target}
          providers={enabledProviders}
          initialMode={mode === "signup" ? "signup" : "signin"}
        />
      </div>
    </main>
  );
}
