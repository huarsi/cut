import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Logo } from "./logo";
import { SignOutButton } from "./sign-out-button";

export async function Header({ narrow = false }: { narrow?: boolean }) {
  const session = await getSession();

  return (
    <header
      className={`mx-auto flex h-16 w-full items-center ${narrow ? "max-w-3xl" : "max-w-5xl"} justify-between px-4 sm:px-6`}
    >
      <Logo href={session ? "/dashboard" : "/"} />
      <nav className="flex items-center gap-1 text-sm">
        {session ? (
          <>
            <NavLink href="/dashboard">Links</NavLink>
            <NavLink href="/dashboard/keys">API</NavLink>
            <NavLink href="/docs">Docs</NavLink>
            <SignOutButton />
          </>
        ) : (
          <>
            <NavLink href="/docs">Docs</NavLink>
            <Link href="/login" className="btn-primary ml-2 h-9 px-4 text-sm">
              Entrar
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg px-3 py-2 text-muted transition hover:text-fg">
      {children}
    </Link>
  );
}
