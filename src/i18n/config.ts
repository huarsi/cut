export const LOCALES = ["es", "en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "cut_lang";

export const LOCALE_NAMES: Record<Locale, string> = { es: "Español", en: "English", pt: "Português" };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);
