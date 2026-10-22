import { Header } from "@/components/header";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-14">{children}</main>
    </>
  );
}
