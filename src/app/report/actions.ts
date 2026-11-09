"use server";

import { getT } from "@/i18n/server";
import { REPORT_REASONS, type ReportReason } from "@/lib/limits";
import { LinkError } from "@/lib/links";
import { createReport } from "@/lib/reports";

export type ReportState = { ok: true } | { ok: false; error: string } | null;

export async function reportAction(_prev: ReportState, form: FormData): Promise<ReportState> {
  // Campo oculto: una persona no lo ve ni lo llena; un bot de spam sí. Le decimos que salió bien.
  if (form.get("website")) return { ok: true };

  const reason = String(form.get("reason"));
  try {
    await createReport({
      link: String(form.get("link") ?? ""),
      reason: REPORT_REASONS.includes(reason as ReportReason) ? (reason as ReportReason) : "other",
      details: String(form.get("details") ?? ""),
      email: String(form.get("email") ?? ""),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof LinkError) return { ok: false, error: (await getT()).errors[error.code] };
    throw error;
  }
}
