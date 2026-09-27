import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { buttonClass } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getMe } from "@/lib/me";
import { AcceptInvitationForm } from "./accept-invitation-form";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="w-full max-w-md rounded-3xl bg-surface p-6 text-center shadow-panel md:p-8">{children}</div>;
}

function Heading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="font-display text-label-xl text-balance md:text-title-h4">{title}</h1>
      <p className="mt-2 text-p-md text-balance text-muted">{children}</p>
    </>
  );
}

// The page's sign when the invitation can't be used.
function Notice({ icon }: { icon: IconName }) {
  return (
    <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-subtle text-muted">
      <Icon name={icon} className="size-5" />
    </div>
  );
}

function Detail({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-subtle p-2 pr-4 text-left">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
        <Icon name={icon} className="size-4" />
      </div>
      <p className="text-p-sm text-muted">{label}</p>
      <p className="ml-auto text-right text-label-sm">{value}</p>
    </div>
  );
}

// Opening the link accepts nothing: mail scanners open every link in an
// email, so the User confirms here (ADR 0043).
export default async function InvitationPage({ params }: PageProps<"/invitations/[invitationId]">) {
  const { invitationId } = await params;
  const [t, format, me, result] = await Promise.all([
    getTranslations("invitation"),
    getFormatter(),
    getMe(),
    api().then((client) => client.GET("/invitations/{invitationId}", { params: { path: { invitationId } } })),
  ]);

  // Signed in with another address than the one it was sent to.
  if (result.response.status === 403) {
    return (
      <Panel>
        <Notice icon="user" />
        <Heading title={t("otherAccountTitle")}>{t("otherAccount", { email: me.email })}</Heading>
        <div className="mt-7 flex justify-center">
          <SignOutButton labelled />
        </div>
      </Panel>
    );
  }

  const { status, invitedBy, location, role, expiresAt } = await pageData(result);
  const place = { location: location.name, business: location.business.name };
  if (status !== "PENDING") {
    return (
      <Panel>
        <Notice icon={status === "ACCEPTED" ? "check" : "time"} />
        <Heading title={t("unavailableTitle")}>
          {status === "ACCEPTED" ? t("accepted", place) : t("lapsed", { ...place, inviter: invitedBy.name })}
        </Heading>
        <Link href="/" className={`${buttonClass({ size: "lg" })} mt-7`}>
          {t("toDashboard")}
        </Link>
      </Panel>
    );
  }

  return (
    <Panel>
      {/* The inviter joining the User to the Business, both as marks. */}
      <div aria-hidden="true" className="mb-6 flex justify-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-subtle text-label-lg ring-4 ring-surface">
          {initials(invitedBy.name)}
        </span>
        <span className="-ml-3 flex size-16 rotate-6 items-center justify-center rounded-2xl bg-brand text-label-lg ring-4 ring-surface">
          {initials(location.business.name)}
        </span>
      </div>
      <Heading title={t("title", { inviter: invitedBy.name })}>{t("body", place)}</Heading>
      <div className="mt-7 flex flex-col gap-2">
        <Detail icon="home" label={t("location")} value={location.name} />
        <Detail icon="user" label={t("role")} value={t(`roleNames.${role}`)} />
        <Detail
          icon="time"
          label={t("expires")}
          value={format.dateTime(new Date(expiresAt), { day: "numeric", month: "long" })}
        />
      </div>
      <AcceptInvitationForm invitationId={invitationId} />
      <p className="mt-4 text-p-xs text-muted">{t("signedInAs", { email: me.email })}</p>
    </Panel>
  );
}
