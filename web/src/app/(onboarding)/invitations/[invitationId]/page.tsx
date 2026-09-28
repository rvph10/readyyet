import { getFormatter, getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar, initials } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getOptionalMe } from "@/lib/me";
import { ContinueAs } from "./continue-as";
import { InvitationActions } from "./invitation-actions";

// Past this, the rest of the team is a count.
const TEAM_SHOWN = 5;

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

// The Business's logo, shown for all its Locations (ADR 0051), or its
// initials on the brand lime without one.
function BusinessMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div className="mx-auto mb-5 flex size-18 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface">
      {logoUrl ? (
        // Served by the API, already resized when uploaded (ADR 0026).
        <Image src={logoUrl} alt={name} width={72} height={72} unoptimized className="size-full object-contain p-2" />
      ) : (
        <span aria-hidden="true" className="flex size-full items-center justify-center bg-brand text-label-lg text-ink">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

// Opening the link accepts nothing: mail scanners open every link in an
// email, so the User confirms here (ADR 0043). It's shown signed out too,
// naming the address to sign in with (ADR 0051).
export default async function InvitationPage({ params }: PageProps<"/invitations/[invitationId]">) {
  const { invitationId } = await params;
  const [t, format, me, preview] = await Promise.all([
    getTranslations("invitation"),
    getFormatter(),
    getOptionalMe(),
    api()
      .then((client) => client.GET("/invitations/{invitationId}/preview", { params: { path: { invitationId } } }))
      .then(pageData),
  ]);
  const { status, invitedBy, location, email } = preview;
  const place = { location: location.name, business: location.business.name };

  if (status !== "PENDING") {
    const notice =
      status === "ACCEPTED"
        ? { icon: "check" as const, title: t("unavailableTitle"), text: t("accepted", place) }
        : status === "DECLINED"
          ? {
              icon: "info-triangle" as const,
              title: t("declinedTitle"),
              text: t("declined", { inviter: invitedBy.name }),
            }
          : {
              icon: "time" as const,
              title: t("unavailableTitle"),
              text: t("lapsed", { ...place, inviter: invitedBy.name }),
            };
    return (
      <Panel>
        <Notice icon={notice.icon} />
        <Heading title={notice.title}>{notice.text}</Heading>
        <Link href="/" className={`${buttonClass({ size: "lg" })} mt-7`}>
          {t("toDashboard")}
        </Link>
      </Panel>
    );
  }

  if (me && me.email.toLowerCase() !== email.toLowerCase()) {
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

  const header = (
    <>
      <BusinessMark name={location.business.name} logoUrl={location.business.logoUrl} />
      <div className="mb-4 flex items-center justify-center gap-2 text-p-xs text-muted">
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-label-xs text-amber-800">{t("pending")}</span>
        {t("invitedWhen", { when: format.relativeTime(new Date(preview.createdAt)) })}
      </div>
      <Heading title={t("title", { inviter: invitedBy.name, location: location.name })}>
        {t("body", { business: location.business.name, role: t(`roles.${preview.role}`) })}
      </Heading>
    </>
  );

  if (!me) {
    return (
      <Panel>
        {header}
        <ContinueAs email={email} invitationId={invitationId} />
      </Panel>
    );
  }

  const { team } = await pageData(
    await (await api()).GET("/invitations/{invitationId}", { params: { path: { invitationId } } }),
  );
  return (
    <Panel>
      {header}
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="flex">
          {team.slice(0, TEAM_SHOWN).map((member) => (
            <Avatar
              key={member.id}
              id={member.id}
              name={member.name}
              src={member.avatarUrl}
              className="-ml-2 ring-3 ring-surface first:ml-0"
            />
          ))}
          {team.length > TEAM_SHOWN && (
            <span className="-ml-2 flex size-10 items-center justify-center rounded-full bg-ink text-label-xs text-surface ring-3 ring-surface">
              +{team.length - TEAM_SHOWN}
            </span>
          )}
        </div>
        <p className="text-p-xs text-muted">{t("team", { count: team.length })}</p>
      </div>
      <InvitationActions invitationId={invitationId} />
      <p className="mt-4 text-p-xs text-muted">{t("signedInAs", { email: me.email })}</p>
    </Panel>
  );
}
