import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { ErrorLayout } from "@/components/error-layout";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).errorPage.notFoundTitle };
}

export default async function NotFound() {
  const t = (await getT()).errorPage;
  return (
    <>
      <Header />
      <ErrorLayout code="404" title={t.notFoundTitle} text={t.notFoundText}>
        <Link href="/" className="btn-primary">
          {t.goHome}
        </Link>
      </ErrorLayout>
    </>
  );
}
