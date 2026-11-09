import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { hasPassword, requireUser } from "@/lib/auth";
import { UnlimitedRequest } from "@/components/unlimited-request";
import { emailEnabled } from "@/lib/email";
import { LINK_LIMITS, linkUsage } from "@/lib/links";
import { unlimitedStatus } from "@/lib/support";
import { DeleteAccount, PasswordForm, UsernameForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).meta.settings };
}

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const [t, withPassword, usage, unlimited] = await Promise.all([
    getT(),
    hasPassword(user.id),
    linkUsage(user.id),
    unlimitedStatus(user.id),
  ]);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        {t.meta.settings}
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-1 text-muted">{t.settings.subtitle}</p>

      <div className="mt-8 space-y-4">
        <Card title={t.settings.email}>
          <p className="text-sm">{user.email}</p>
        </Card>

        <Card title={t.settings.usernameTitle} text={t.settings.usernameText}>
          <UsernameForm current={user.username ?? null} />
        </Card>

        <Card title={t.settings.limitsTitle}>
          {unlimited !== "unlimited" && (
            <p className="mb-3 text-sm text-muted">
              {t.unlimited.limits(LINK_LIMITS.hour, LINK_LIMITS.day)} {t.unlimited.usage(usage.hour, usage.day)}
            </p>
          )}
          <UnlimitedRequest initialStatus={unlimited} />
        </Card>

        <Card title={t.settings.passwordTitle}>
          <PasswordForm hasPassword={withPassword} canResetPassword={emailEnabled} />
        </Card>

        <Card title={t.settings.deleteTitle} text={t.settings.deleteText} danger>
          <DeleteAccount hasPassword={withPassword} />
        </Card>
      </div>
    </>
  );
}

function Card({
  title,
  text,
  danger = false,
  children,
}: {
  title: string;
  text?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border bg-card p-5 ${danger ? "border-danger/30" : "border-line"}`}>
      <h2 className={`font-medium ${danger ? "text-danger" : ""}`}>{title}</h2>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
