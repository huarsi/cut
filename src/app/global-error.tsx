"use client";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import "./globals.css";

/** Idioma de la cookie o del navegador. Aquí no hay layout ni contexto de preferencias. */
function detectLocale() {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const fromCookie = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`))?.[1];
  if (isLocale(fromCookie)) return fromCookie;
  const fromBrowser = navigator.language.slice(0, 2);
  return isLocale(fromBrowser) ? fromBrowser : DEFAULT_LOCALE;
}

// Último recurso: falla el layout principal. Sigue el tema del sistema y usa la fuente del sistema.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const locale = detectLocale();
  const t = dictionaries[locale].errorPage;
  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col items-center justify-center px-4 text-center font-sans">
        <title>{t.errorTitle}</title>
        <p className="text-xl font-semibold">
          cut<span className="text-accent">.</span>
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{t.errorTitle}</h1>
        <p className="mt-3 max-w-md text-muted">{t.errorText}</p>
        <button type="button" onClick={() => retry()} className="btn-primary mt-8">
          {t.retry}
        </button>
      </body>
    </html>
  );
}
