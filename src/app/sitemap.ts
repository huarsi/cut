import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/links";

// Solo las páginas públicas. Los links cortos no van: son redirecciones a otros sitios.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/docs", "/login", "/report"].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
}
