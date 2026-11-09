import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { PreferencesProvider } from "@/components/preferences";
import { getLocale, getT } from "@/i18n/server";
import { baseUrl } from "@/lib/links";
import { getTheme } from "@/lib/theme-server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return {
    // Para que las imágenes de vista previa usen URLs absolutas con el dominio real.
    metadataBase: new URL(baseUrl),
    title: { default: t.meta.title, template: "%s · cut." },
    description: t.meta.description,
    openGraph: {
      type: "website",
      siteName: "cut.",
      title: t.meta.title,
      description: t.meta.description,
      url: "/",
      locale: OG_LOCALES[locale],
    },
    // X/Twitter usa la misma imagen de opengraph-image.tsx, en grande.
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description },
  };
}

const OG_LOCALES = { es: "es_MX", en: "en_US", pt: "pt_BR" } as const;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);

  return (
    <html
      lang={locale}
      data-theme={theme === "system" ? undefined : theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <PreferencesProvider locale={locale} theme={theme}>
          <ConfirmProvider>{children}</ConfirmProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
