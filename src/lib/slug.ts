// Reglas de slugs compartidas por servidor y cliente (sin dependencias de servidor).

/** Largo del código aleatorio: el usuario elige entre min y max; si no elige, se usa `default`. */
export const SLUG_LENGTH = { min: 3, max: 7, default: 5 } as const;
export const SLUG_LENGTHS = [3, 4, 5, 6, 7] as const;

export const ALIAS_MAX = 100;
export const ALIAS_PATTERN = new RegExp(`^[a-zA-Z0-9_-]{3,${ALIAS_MAX}}$`);

/** Devuelve un largo válido; cualquier valor fuera de rango cae al de por defecto. */
export function parseSlugLength(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n >= SLUG_LENGTH.min && n <= SLUG_LENGTH.max ? n : SLUG_LENGTH.default;
}
