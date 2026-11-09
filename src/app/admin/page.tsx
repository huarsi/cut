import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Header } from "@/components/header";
import { canModerate, requireListedAdmin } from "@/lib/admin";
import { displayUrl, timeAgo } from "@/lib/format";
import { shortHost } from "@/lib/links";
import {
  countOpenReports,
  listBlockedDomains,
  listDisabledLinks,
  listReportGroups,
  REASON_LABELS,
  type ReportGroup,
} from "@/lib/reports";
import { LINK_LIMITS } from "@/lib/links";
import { countOpenRequests, listOpenRequests, listUnlimitedUsers } from "@/lib/support";
import {
  enableLinkAction,
  resolveRequestAction,
  revokeUnlimitedAction,
  unblockDomainAction,
} from "./actions";
import { ActionButton, BlockDomainForm, GrantUnlimitedForm, ReplyToReporter, ReportActions, VerifyEmail } from "./buttons";

// El portal es solo para quien modera, así que está solo en español.
export const metadata: Metadata = { title: "Moderación" };

const TABS = {
  open: "Reportes",
  history: "Historial",
  disabled: "Desactivados",
  domains: "Dominios",
  accounts: "Cuentas",
} as const;
type Tab = keyof typeof TABS;

const ago = (date: Date | null) => (date ? timeAgo(date, "es") : "");

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireListedAdmin();
  const { tab: tabParam, error } = await searchParams;
  if (!canModerate(admin)) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-md flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-14">
          <h1 className="text-3xl font-semibold tracking-tight">
            Confirma tu correo<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-muted">
            Para entrar a moderación, confirma que <span className="text-fg">{admin.email}</span> es tuyo con un
            link que te mandamos por correo. Solo hace falta una vez.
          </p>
          <VerifyEmail
            email={admin.email}
            linkError={
              typeof error === "string"
                ? `${error === "TOKEN_EXPIRED" ? "El link ya venció." : "El link no es válido."} Pide uno nuevo.`
                : null
            }
          />
        </main>
      </>
    );
  }
  const tab: Tab = typeof tabParam === "string" && tabParam in TABS ? (tabParam as Tab) : "open";
  const [openCount, requestCount] = await Promise.all([countOpenReports(), countOpenRequests()]);
  const badges: Partial<Record<Tab, number>> = { open: openCount, accounts: requestCount };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-14">
        <h1 className="text-3xl font-semibold tracking-tight">
          Moderación<span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-muted">Reportes de links sospechosos, dominios bloqueados y cuentas ilimitadas.</p>

        <nav className="mt-8 flex gap-1 overflow-x-auto rounded-xl border border-line bg-card p-1 text-sm">
          {(Object.keys(TABS) as Tab[]).map((id) => (
            <Link
              key={id}
              href={id === "open" ? "/admin" : `/admin?tab=${id}`}
              aria-current={tab === id ? "page" : undefined}
              className="flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 font-medium text-muted transition hover:text-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
            >
              {TABS[id]}
              {Boolean(badges[id]) && (
                <span className="rounded-full bg-danger px-1.5 text-xs text-white tabular-nums">{badges[id]}</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "open" && <OpenReports adminEmail={admin.email} />}
          {tab === "history" && <History adminEmail={admin.email} />}
          {tab === "disabled" && <DisabledLinks />}
          {tab === "domains" && <Domains />}
          {tab === "accounts" && <Accounts />}
        </div>
      </main>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-muted">{children}</div>
  );
}

/** Slug y destino. El destino va como texto, no como link, para no abrir un sitio de phishing por error. */
function LinkSummary({ group }: { group: ReportGroup }) {
  const url = group.link?.url ?? group.reports[0].url;
  return (
    <div className="min-w-0">
      <p className="font-mono font-medium">
        {shortHost}/{group.slug}
      </p>
      <div className="mt-1 flex items-start gap-1">
        <p className="min-w-0 flex-1 font-mono text-sm break-all text-muted">{url}</p>
        <CopyButton value={url} className="-mt-2 shrink-0" />
      </div>
    </div>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

type Report = ReportGroup["reports"][number];

/** Correo de quien reportó, si ya se le avisó del resultado y el botón para responderle a mano. */
function Reporter({ report: r, adminEmail }: { report: Report; adminEmail: string }) {
  if (!r.reporterEmail) return null;
  const state = r.reply ? "respondido a mano" : r.notifiedAt ? "avisado del resultado" : r.status !== "open" && "sin avisar";
  return (
    <>
      <span>{r.reporterEmail}</span>
      {state && <span className={r.notifiedAt ? "text-fg" : undefined}>{state}</span>}
      <ReplyToReporter reportId={r.id} email={r.reporterEmail} adminEmail={adminEmail} />
      {r.reply && (
        <span className="basis-full border-l-2 border-line pl-2 whitespace-pre-line text-fg/80">{r.reply}</span>
      )}
    </>
  );
}

/** Cuántas personas distintas dejaron su correo y todavía no saben el resultado. */
const toNotify = (reports: Report[]) =>
  new Set(reports.filter((r) => r.reporterEmail && !r.notifiedAt).map((r) => r.reporterEmail!.toLowerCase())).size;

async function OpenReports({ adminEmail }: { adminEmail: string }) {
  const groups = await listReportGroups("open");
  if (groups.length === 0) return <Empty>No hay reportes pendientes.</Empty>;

  return (
    <ul className="space-y-4">
      {groups.map((group) => {
        const host = group.link ? hostOf(group.link.url) : null;
        const reasons = Object.entries(
          group.reports.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.reason]: (acc[r.reason] ?? 0) + 1 }), {}),
        );
        return (
          <li key={group.key} className="rounded-2xl border border-line bg-card p-5">
            <LinkSummary group={group} />

            <p className="mt-3 text-xs text-muted">
              {group.link ? (
                <>
                  {group.owner ? `@${group.owner}` : group.ownerEmail ?? "sin cuenta"} · {group.link.clicks} clics
                  reales · creado {ago(group.link.createdAt)}
                  {group.link.disabledAt && <span className="text-danger"> · ya desactivado</span>}
                </>
              ) : (
                <span className="text-danger">El link ya fue borrado.</span>
              )}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {reasons.map(([reason, n]) => (
                <span key={reason} className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
                  {REASON_LABELS[reason as keyof typeof REASON_LABELS]}
                  {n > 1 && ` ×${n}`}
                </span>
              ))}
            </div>

            <ul className="mt-3 space-y-2 border-t border-line pt-3">
              {group.reports.slice(0, 5).map((r) => (
                <li key={r.id} className="text-sm">
                  {r.details && <p className="whitespace-pre-line">{r.details}</p>}
                  <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-muted [&>*:not(:first-child)]:before:mr-1.5 [&>*:not(:first-child)]:before:content-['·'] [&>form]:before:hidden [&>.basis-full]:before:hidden">
                    <span>{REASON_LABELS[r.reason]}</span>
                    <span>{ago(r.createdAt)}</span>
                    <Reporter report={r} adminEmail={adminEmail} />
                  </div>
                </li>
              ))}
              {group.reports.length > 5 && (
                <li className="text-xs text-muted">y {group.reports.length - 5} reportes más</li>
              )}
            </ul>

            <ReportActions
              groupKey={group.key}
              linkId={group.link?.id ?? null}
              host={host}
              linkDisabled={Boolean(group.link?.disabledAt)}
              toNotify={toNotify(group.reports)}
            />
          </li>
        );
      })}
    </ul>
  );
}

const STATUS_LABELS = { disabled: "Desactivado", dismissed: "Descartado", open: "Pendiente" } as const;

async function History({ adminEmail }: { adminEmail: string }) {
  const groups = await listReportGroups("resolved");
  if (groups.length === 0) return <Empty>Todavía no hay reportes resueltos.</Empty>;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
      {groups.map((group) => {
        const last = group.reports[0];
        return (
          <li key={group.key} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
            <div className="min-w-0 flex-1">
              <LinkSummary group={group} />
              {group.reports.some((r) => r.reporterEmail) && (
                <ul className="mt-2 space-y-1">
                  {group.reports
                    .filter((r) => r.reporterEmail)
                    .map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-muted [&>*:not(:first-child)]:before:mr-1.5 [&>*:not(:first-child)]:before:content-['·'] [&>form]:before:hidden [&>.basis-full]:before:hidden"
                      >
                        <Reporter report={r} adminEmail={adminEmail} />
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div className="shrink-0 text-xs text-muted sm:text-right">
              <p className={last.status === "disabled" ? "font-medium text-danger" : "font-medium text-fg"}>
                {STATUS_LABELS[last.status]}
              </p>
              <p>
                {group.reports.length} {group.reports.length === 1 ? "reporte" : "reportes"} · {ago(last.resolvedAt)}
              </p>
              {last.resolvedBy && <p>{last.resolvedBy}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function DisabledLinks() {
  const links = await listDisabledLinks();
  if (links.length === 0) return <Empty>No hay links desactivados.</Empty>;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
      {links.map((l) => (
        <li key={l.id} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-medium">
              {shortHost}/{l.slug}
            </p>
            <p className="truncate font-mono text-xs text-muted" title={l.url}>
              {displayUrl(l.url)}
            </p>
            <p className="text-xs text-muted">desactivado {ago(l.disabledAt)}</p>
          </div>
          <ActionButton
            action={enableLinkAction.bind(null, l.id)}
            confirm={{ title: `¿Reactivar /${l.slug}?`, text: `Volverá a redirigir a ${displayUrl(l.url)}.`, label: "Reactivar" }}
          >
            Reactivar
          </ActionButton>
        </li>
      ))}
    </ul>
  );
}

async function Domains() {
  const domains = await listBlockedDomains();
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="mb-3 text-sm text-muted">
          Bloquear un dominio impide crear links hacia él o sus subdominios y desactiva los que ya existen.
          Desbloquearlo no reactiva esos links.
        </p>
        <BlockDomainForm />
      </div>
      {domains.length === 0 ? (
        <Empty>No hay dominios bloqueados desde aquí.</Empty>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {domains.map((d) => (
            <li key={d.domain} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-medium">{d.domain}</p>
                <p className="text-xs text-muted">
                  {d.note ? `${d.note} · ` : ""}
                  {ago(d.createdAt)}
                </p>
              </div>
              <ActionButton
                action={unblockDomainAction.bind(null, d.domain)}
                confirm={{
                  title: `¿Desbloquear ${d.domain}?`,
                  text: "Se podrán crear links hacia él otra vez. Los links que ya estaban desactivados siguen así.",
                  label: "Desbloquear",
                }}
              >
                Desbloquear
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function Accounts() {
  const [requests, unlimitedUsers] = await Promise.all([listOpenRequests(), listUnlimitedUsers()]);
  const name = (u: { username: string | null; email: string }) => (u.username ? `@${u.username}` : u.email);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        Las cuentas normales pueden crear {LINK_LIMITS.hour.toLocaleString("es-MX")} links por hora y{" "}
        {LINK_LIMITS.day.toLocaleString("es-MX")} por día. Las ilimitadas no tienen tope.
      </p>

      <section>
        <h2 className="mb-3 font-medium">Solicitudes</h2>
        {requests.length === 0 ? (
          <Empty>No hay solicitudes pendientes.</Empty>
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-card p-5">
                <p className="font-medium">{name(r)}</p>
                <p className="text-xs text-muted">
                  {r.email} · {r.links.toLocaleString("es-MX")} links · cuenta creada {ago(r.userCreatedAt)} · pidió{" "}
                  {ago(r.createdAt)}
                </p>
                {r.message && <p className="mt-3 text-sm whitespace-pre-line">{r.message}</p>}
                <div className="mt-4 flex gap-2">
                  <ActionButton action={resolveRequestAction.bind(null, r.id, true)}>Aprobar</ActionButton>
                  <ActionButton
                    action={resolveRequestAction.bind(null, r.id, false)}
                    confirm={{ title: `¿Rechazar la solicitud de ${name(r)}?`, text: "Le avisaremos por correo.", label: "Rechazar", danger: true }}
                  >
                    Rechazar
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-medium">Dar cuenta ilimitada</h2>
        <div className="rounded-2xl border border-line bg-card p-4">
          <GrantUnlimitedForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Cuentas ilimitadas</h2>
        {unlimitedUsers.length === 0 ? (
          <Empty>Ninguna cuenta es ilimitada todavía.</Empty>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {unlimitedUsers.map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name(u)}</p>
                  <p className="truncate text-xs text-muted">
                    {u.email} · {u.links.toLocaleString("es-MX")} links
                  </p>
                </div>
                <ActionButton
                  action={revokeUnlimitedAction.bind(null, u.id)}
                  confirm={{ title: `¿Quitarle lo ilimitado a ${name(u)}?`, text: "Volverá al límite normal de links.", label: "Quitar", danger: true }}
                >
                  Quitar
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
