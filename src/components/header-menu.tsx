"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LOCALE_NAMES, LOCALES } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";
import { THEME_SWATCHES, THEMES, type Theme } from "@/lib/theme";
import { usePreferences, useT } from "./preferences";

type User = { name: string; email: string } | null;

/** Un solo botón en el header: navegación, tema, idioma y salir. */
export function HeaderMenu({ user }: { user: User }) {
  const t = useT();
  const router = useRouter();
  const { theme, setTheme, locale, setLocale, changingLocale } = usePreferences();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  async function signOut() {
    close();
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
        className="grid size-9 cursor-pointer place-items-center rounded-xl border border-line bg-card transition hover:border-fg/30"
      >
        <span className="relative block h-3 w-4">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute left-0 block h-[1.5px] w-4 rounded-full bg-fg"
              style={{ top: i * 5 }}
              animate={
                open
                  ? i === 1
                    ? { opacity: 0, scaleX: 0 }
                    : { top: 5, rotate: i === 0 ? 45 : -45 }
                  : { top: i * 5, rotate: 0, opacity: 1, scaleX: 1 }
              }
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
            />
          ))}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.16 }}
            style={{ transformOrigin: "top right" }}
            className="absolute top-full right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-card shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
          >
            {user && (
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fg text-sm font-semibold text-bg uppercase">
                  {user.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>
            )}

            <nav className="p-1.5">
              {user && (
                <>
                  <MenuLink href="/dashboard" onClick={close}>
                    {t.nav.links}
                  </MenuLink>
                  <MenuLink href="/dashboard/keys" onClick={close}>
                    {t.nav.keys}
                  </MenuLink>
                </>
              )}
              <MenuLink href="/docs" onClick={close}>
                {t.nav.docs}
              </MenuLink>
            </nav>

            <Section title={t.nav.theme}>
              <div className="grid grid-cols-5 gap-1">
                {THEMES.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    aria-pressed={theme === id}
                    className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg py-1.5 text-[11px] text-muted transition hover:text-fg aria-pressed:text-fg"
                  >
                    <Swatch theme={id} active={theme === id} />
                    {t.themes[id]}
                  </button>
                ))}
              </div>
            </Section>

            <Section title={t.nav.language}>
              <div className="relative grid grid-cols-3 rounded-lg bg-fg/[0.05] p-0.5">
                {LOCALES.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLocale(id)}
                    aria-pressed={locale === id}
                    disabled={changingLocale}
                    className="relative h-8 cursor-pointer rounded-md text-xs font-medium text-muted transition-colors hover:text-fg aria-pressed:text-fg"
                  >
                    {locale === id && (
                      <motion.span
                        layoutId="menu-locale"
                        className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-line"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative">{LOCALE_NAMES[id]}</span>
                  </button>
                ))}
              </div>
            </Section>

            {user && (
              <div className="border-t border-line p-1.5">
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:bg-danger/10 hover:text-danger"
                >
                  {t.nav.signOut}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="block rounded-lg px-3 py-2 text-sm transition hover:bg-fg/5"
    >
      {children}
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line px-3 py-3">
      <p className="mb-2 px-1 text-xs font-medium text-muted">{title}</p>
      {children}
    </div>
  );
}

/** Círculo con el fondo y el acento de cada tema; "Sistema" muestra claro y oscuro a la mitad. */
function Swatch({ theme, active }: { theme: Theme; active: boolean }) {
  const ring = active ? "ring-2 ring-fg ring-offset-2 ring-offset-card" : "ring-1 ring-line";
  if (theme === "system") {
    return (
      <span
        className={`relative size-7 overflow-hidden rounded-full transition ${ring}`}
        style={{ background: `linear-gradient(135deg, ${THEME_SWATCHES.light.bg} 50%, ${THEME_SWATCHES.dark.bg} 50%)` }}
      />
    );
  }
  const { bg, accent } = THEME_SWATCHES[theme];
  return (
    <span className={`grid size-7 place-items-center rounded-full transition ${ring}`} style={{ background: bg }}>
      <span className="size-2.5 rounded-full" style={{ background: accent }} />
    </span>
  );
}
