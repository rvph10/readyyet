import { calendarDateIn } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { Banner } from "@/components/ui/banner";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getMe } from "@/lib/me";
import { getBilling, getLocation } from "../location-data";
import { PageHeader } from "../page-header";
import { isManager } from "../sections";
import { formatDay } from "../tickets/ticket-views";
import { TeamBoard } from "./team-board";
import { openInvitations, placesTaken } from "./team-views";

// Someone accepting shows without a reload.
const REFRESH_EVERY_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// ADR 0099: who works here, who's been asked to, and room for more.
export default async function TeamPage({ params }: PageProps<"/locations/[locationId]/team">) {
  const [{ locationId }, me, t, tDashboard, locale, client] = await Promise.all([
    params,
    getMe(),
    getTranslations("team"),
    getTranslations("dashboard"),
    getLocale(),
    api(),
  ]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership || !isManager(membership.role)) {
    notFound();
  }
  const path = { params: { path: { locationId } } };
  const [members, invitations, billing, { timeZone }] = await Promise.all([
    client.GET("/locations/{locationId}/memberships", path).then(pageData),
    client.GET("/locations/{locationId}/invitations", path).then(pageData),
    getBilling(locationId),
    getLocation(locationId),
  ]);

  const now = new Date();
  const today = calendarDateIn(now, timeZone);
  const open = openInvitations(
    invitations,
    members.map(({ user }) => user.email),
    now,
  );
  const taken = placesTaken(members.length, open);
  const full = billing.memberLimit !== null && taken >= billing.memberLimit;

  return (
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <PageHeader locationId={locationId} title={tDashboard("sections.team")} />
      {billing.frozen && (
        <Banner tone="error" action={{ href: `/locations/${locationId}/billing`, label: t("seePlans") }}>
          {t("frozen")}
        </Banner>
      )}
      <TeamBoard
        locationId={locationId}
        meId={me.id}
        myRole={membership.role}
        members={members.map((member) => ({
          ...member,
          joinedShown: formatDay(calendarDateIn(new Date(member.createdAt), timeZone), today, locale),
        }))}
        invitations={open.map((invitation) => ({
          ...invitation,
          expiresInDays: Math.max(Math.ceil((new Date(invitation.expiresAt).getTime() - now.getTime()) / DAY_MS), 0),
        }))}
        taken={taken}
        limit={billing.memberLimit}
        canInvite={!billing.frozen && !full}
      />
    </>
  );
}
