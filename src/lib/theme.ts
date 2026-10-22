export const THEMES = ["system", "light", "dark", "navy", "fun"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "cut_theme";

export const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

// Colores de muestra para el selector. Los tokens reales viven en globals.css.
export const THEME_SWATCHES: Record<Exclude<Theme, "system">, { bg: string; accent: string }> = {
  light: { bg: "#fafafa", accent: "#0a0a0a" },
  dark: { bg: "#0a0a0a", accent: "#fafafa" },
  navy: { bg: "#0a1428", accent: "#5b9dff" },
  fun: { bg: "#fff7ef", accent: "#ff5a1f" },
};
