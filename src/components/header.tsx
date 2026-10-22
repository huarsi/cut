import Link from "next/link";
import { getT } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { HeaderMenu } from "./header-menu";
import { Logo } from "./logo";

export async function Header({ hideSignIn = false }: { hideSignIn?: boolean }) {
  const [session, t] = await Promise.all([getSession(), getT()]);
  const user = session && {
    name: session.user.displayUsername ?? session.user.name,
    email: session.user.email,
  };

  return (
    <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
      <Logo href={session ? "/dashboard" : "/"} />
      <div className="flex items-center gap-2">
        {!session && !hideSignIn && (
          <Link href="/login" className="btn-primary h-9 px-4 text-sm">
            {t.nav.signIn}
          </Link>
        )}
        <HeaderMenu user={user} />
      </div>
    </header>
  );
}
