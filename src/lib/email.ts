import { createHash } from "node:crypto";
import { Resend } from "resend";

const { RESEND_API_KEY, EMAIL_FROM } = process.env;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * En producción hace falta Resend para mandar correos; en desarrollo, sin llave,
 * el correo se imprime en la terminal para poder seguir el link.
 */
export const emailEnabled = Boolean(resend && EMAIL_FROM) || process.env.NODE_ENV !== "production";

type Email = {
  /** Una dirección o varias (Resend recibe una lista). */
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  /** Evita mandar dos veces el mismo correo si se reintenta (Resend lo recuerda 24 h). */
  idempotencyKey: string;
};

export async function sendEmail({ to, subject, text, html, idempotencyKey }: Email) {
  if (!resend || !EMAIL_FROM) {
    console.log(`\n[email] Para: ${[to].flat().join(", ")}\n[email] Asunto: ${subject}\n${text}\n`);
    return;
  }
  // El SDK de Resend no lanza errores: los devuelve en `error`.
  const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, text, html }, { idempotencyKey });
  if (error) throw new Error(`Resend: ${error.message}`);
}

/** Clave estable que no expone el token en los registros de Resend. */
export const keyFor = (kind: string, secret: string) =>
  `${kind}/${createHash("sha256").update(secret).digest("hex").slice(0, 32)}`;

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Correo sencillo: el logo, un párrafo, un botón y el link en texto por si el botón no se ve.
 * El logo va como texto (no imagen) para que se vea aunque el cliente de correo bloquee imágenes.
 */
export function simpleEmail({ intro, button, url, outro }: { intro: string; button: string; url: string; outro: string }) {
  const text = `${intro}\n\n${url}\n\n${outro}`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#fafafa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a">
  <div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:28px">
    <p style="margin:0 0 20px;font-size:24px;font-weight:600;letter-spacing:-0.5px;line-height:1">cut<span style="color:#ff5a1f">.</span></p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.5;white-space:pre-line">${escape(intro)}</p>
    <a href="${escape(url)}" style="display:inline-block;background:#0a0a0a;color:#fafafa;text-decoration:none;font-size:14px;font-weight:500;padding:11px 18px;border-radius:10px">${escape(button)}</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#737373">${escape(outro)}</p>
    <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#a3a3a3;word-break:break-all">${escape(url)}</p>
  </div>
</body></html>`;
  return { text, html };
}
