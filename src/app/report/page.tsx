import type { Metadata } from "next";
import { Header } from "@/components/header";
import { getT } from "@/i18n/server";
import { ReportForm } from "./report-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.report };
}

export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  const { link } = await searchParams;
  const t = await getT();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-14">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t.meta.report}
          <span className="text-accent">.</span>
        </h1>
        <p className="mt-2 text-muted">{t.report.text}</p>
        <div className="mt-8">
          <ReportForm defaultLink={typeof link === "string" ? link.slice(0, 200) : ""} />
        </div>
      </main>
    </>
  );
}
