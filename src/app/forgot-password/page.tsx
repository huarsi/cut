import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { getT } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { emailEnabled } from "@/lib/email";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.forgot };
}

export default async function ForgotPasswordPage() {
  // Sin forma de mandar correos no hay recuperación; con sesión, se cambia desde la cuenta.
  if (!emailEnabled) redirect("/login");
  if (await getSession()) redirect("/dashboard/settings");
  const t = (await getT()).recovery;

  return (
    <>
      <Header hideSignIn />
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-8 pb-24">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.forgotTitle}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-2 mb-6 text-sm text-muted">{t.forgotText}</p>
          <ForgotForm />
        </div>
      </main>
    </>
  );
}
