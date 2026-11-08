import { calendarDateIn } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { RowsPlaceholder } from "@/components/rows-placeholder";
import { Banner } from "@/components/ui/banner";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
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

// ADR 0099: who works here, who's been asked to, and room for more. ADR 0119:
// both panels stand at once, their people wait.
export default async function TeamPage({ params }: PageProps<"/locations/[locationId]/team">) {
  const [{ locationId }, me, tDashboard] = await Promise.all([params, getMe(), getTranslations("dashboard")]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership || !isManager(membership.role)) {
    notFound();
  }
  return (
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <PageHeader title={tDashboard("sections.team")} />
      <Suspense fallback={<TeamLoading />}>
        <TeamContent locationId={locationId} meId={me.id} role={membership.role} />
      </Suspense>
    </>
  );
}

async function TeamContent({ locationId, meId, role }: { locationId: string; meId: string; role: string }) {
  const [t, locale, client] = await Promise.all([getTranslations("team"), getLocale(), api()]);
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
      {billing.frozen && (
        <Banner tone="error" action={{ href: `/locations/${locationId}/billing`, label: t("seePlans") }}>
          {t("frozen")}
        </Banner>
      )}
      <TeamBoard
        locationId={locationId}
        meId={meId}
        myRole={role}
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

const MEMBERS_WHILE_LOADING = 4;
const INVITATIONS_WHILE_LOADING = 2;

// TeamBoard's two panels and their titles, the people waiting.
function TeamLoading() {
  const t = useTranslations("team");
  return (
    <div
      aria-busy="true"
      className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)] lg:gap-5"
    >
      <Panel padding="none">
        <h2 className="px-5 pt-5 pb-3 text-title-h6 lg:px-7 lg:pt-6">{t("members")}</h2>
        <RowsPlaceholder rows={MEMBERS_WHILE_LOADING} columns={1} />
      </Panel>
      <Panel className="flex flex-col max-lg:order-first">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title-h6">{t("invitations")}</h2>
          <Skeleton className="h-10 w-28 rounded-full!" />
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {Array.from({ length: INVITATIONS_WHILE_LOADING }, (_, row) => (
            <li key={row} className="flex items-center gap-3 py-2">
              <Skeleton className="size-10 shrink-0 rounded-full!" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-44 max-w-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
