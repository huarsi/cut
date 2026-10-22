"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

type Preferences = {
  locale: Locale;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  changingLocale: boolean;
};

const PreferencesContext = createContext<Preferences | null>(null);

function writeCookie(name: string, value: string | null) {
  document.cookie = value
    ? `${name}=${value}; path=/; max-age=31536000; samesite=lax`
    : `${name}=; path=/; max-age=0; samesite=lax`;
}

/** Tema e idioma del visitante. Ambos viven en cookies para que el servidor pinte la página ya con ellos. */
export function PreferencesProvider({
  locale,
  theme: initialTheme,
  children,
}: {
  locale: Locale;
  theme: Theme;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [theme, setThemeState] = useState(initialTheme);
  const [changingLocale, startLocaleChange] = useTransition();

  function setTheme(next: Theme) {
    setThemeState(next);
    writeCookie(THEME_COOKIE, next === "system" ? null : next);
    // Se aplica al momento; sin data-theme, globals.css sigue el tema del sistema.
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
  }

  function setLocale(next: Locale) {
    writeCookie(LOCALE_COOKIE, next);
    // Los textos de los server components se vuelven a pedir con el idioma nuevo.
    startLocaleChange(() => router.refresh());
  }

  return (
    <PreferencesContext.Provider value={{ locale, theme, setTheme, setLocale, changingLocale }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences debe usarse dentro de PreferencesProvider");
  return value;
}

export const useT = () => dictionaries[usePreferences().locale];
