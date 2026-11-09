// Límites compartidos por servidor y cliente (sin dependencias de servidor).

/** Largo máximo de una URL de destino. */
export const URL_MAX = 2048;

/** Largo máximo del nombre de una llave de la API. */
export const KEY_NAME_MAX = 60;

/** Motivos para reportar un link. */
export const REPORT_REASONS = ["phishing", "malware", "spam", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Largo máximo de los detalles de un reporte. */
export const REPORT_DETAILS_MAX = 1000;
