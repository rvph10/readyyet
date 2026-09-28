import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { BusinessAvatar } from "@/components/business-avatar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getOptionalMe } from "@/lib/me";
import { InvitationActions, type Answer } from "./invitation-actions";

// Past this, the rest of the team is a count.
const TEAM_SHOWN = 5;

function Card({ children }: { children: ReactNode }) {
  return (
    <Panel padding="lg" className="w-full max-w-md text-center md:p-8">
      {children}
    </Panel>
  );
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

// Opening the link accepts nothing: mail scanners open every link in an
// email, so the User confirms here (ADR 0043). It looks the same signed out,
// where an answer goes through sign-in first and comes back as ?then= to
// finish (ADR 0064). Only the team needs the User, to be shown.
export default async function InvitationPage({ params, searchParams }: PageProps<"/invitations/[invitationId]">) {
  const [{ invitationId }, { then }] = await Promise.all([params, searchParams]);
  const answered: Answer | undefined = then === "accept" || then === "decline" ? then : undefined;
  const [t, me, preview] = await Promise.all([
    getTranslations("invitation"),
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
      <Card>
        <Notice icon={notice.icon} />
        <Heading title={notice.title}>{notice.text}</Heading>
        <Link href="/" className={`${buttonClass({ size: "lg" })} mt-7`}>
          {t("toDashboard")}
        </Link>
      </Card>
    );
  }

  if (me && me.email.toLowerCase() !== email.toLowerCase()) {
    return (
      <Card>
        <Notice icon="user" />
        <Heading title={t("otherAccountTitle")}>{t("otherAccount", { email: me.email })}</Heading>
        <div className="mt-7 flex justify-center">
          <SignOutButton labelled />
        </div>
      </Card>
    );
  }

  const header = (
    <>
      <BusinessAvatar
        name={location.business.name}
        logoUrl={location.business.logoUrl}
        size="lg"
        className="mx-auto mb-5"
      />
      <div className="mb-4 flex justify-center">
        <Badge>{t("pending")}</Badge>
      </div>
      <Heading title={t("title", { inviter: invitedBy.name, location: location.name })}>
        {t("body", { business: location.business.name, role: t(`roles.${preview.role}`) })}
      </Heading>
    </>
  );

  const actions = (
    <InvitationActions
      invitationId={invitationId}
      email={email}
      signedIn={me !== null}
      answered={answered}
      joined={t("joined", place)}
    />
  );

  if (!me) {
    return (
      <Card>
        {header}
        {actions}
      </Card>
    );
  }

  const { team } = await pageData(
    await (await api()).GET("/invitations/{invitationId}", { params: { path: { invitationId } } }),
  );
  return (
    <Card>
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
      {actions}
      <p className="mt-4 text-p-xs text-muted">{t("signedInAs", { email: me.email })}</p>
    </Card>
  );
}
