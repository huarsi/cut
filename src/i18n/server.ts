import { cookies, headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALES, type Locale } from "./config";
import { dictionaries } from "./dictionaries";

/** Idioma elegido en el menú (cookie); si no hay, el primero del navegador que soportemos. */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const accepted = (await headers()).get("accept-language") ?? "";
  for (const part of accepted.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (LOCALES.includes(code as Locale)) return code as Locale;
  }
  return DEFAULT_LOCALE;
});

export const getT = async () => dictionaries[await getLocale()];
