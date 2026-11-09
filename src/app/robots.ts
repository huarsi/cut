import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/links";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Páginas privadas o sin valor para un buscador.
      disallow: ["/dashboard", "/admin", "/api/", "/forgot-password", "/reset-password"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
