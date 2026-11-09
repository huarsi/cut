"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorLayout } from "@/components/error-layout";
import { Logo } from "@/components/logo";
import { useT } from "@/components/preferences";

// Se muestra cuando algo falla al pintar una página. El header normal es de servidor y
// podría ser justo lo que falló, así que aquí va solo el logo.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useT().errorPage;
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <ErrorLayout code={digest ? t.code(digest) : "500"} title={t.errorTitle} text={t.errorText}>
        <button type="button" onClick={() => retry()} className="btn-primary">
          {t.retry}
        </button>
        <Link href="/" className="btn-ghost">
          {t.goHome}
        </Link>
      </ErrorLayout>
    </>
  );
}
