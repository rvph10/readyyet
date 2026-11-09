import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { cache } from "react";
import { openInvitations, placesTaken } from "@/app/(dashboard)/locations/[locationId]/team/team-views";
import { RowsPlaceholder } from "@/components/rows-placeholder";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getOwnedBusiness } from "@/lib/business";
import { BusinessHeader } from "../business-header";
import { getBusinessLocations } from "../business-data";
import { teamInvitations, teamPeople, type TeamPerson } from "../business-views";
import { InvitePanel } from "./invite-panel";
import { Reveal } from "@/components/reveal";

const GRID = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-x-5";
// More would wrap, and a chain's Admin can be at every Location.
const PLACES_SHOWN = 3;
const place = "flex h-9 max-w-52 items-center truncate rounded-full bg-subtle px-3.5 text-label-xs whitespace-nowrap";

async function PersonRow({ person }: { person: TeamPerson }) {
  const [t, tDashboard] = await Promise.all([getTranslations("business.team"), getTranslations("dashboard")]);
  const { user, owner, places } = person;
  const hidden = places.slice(PLACES_SHOWN);
  return (
    <li className={`grid items-center gap-x-3 gap-y-3 rounded-2xl px-3 py-3 lg:min-h-18 lg:px-4 lg:py-2 ${GRID}`}>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar id={user.id} name={user.name} src={user.avatarUrl} className="lg:size-12! lg:text-base!" />
        <span className="min-w-0">
          <span title={user.name} className="block truncate text-label-md">
            {user.name}
          </span>
          <span title={user.email} className="block truncate text-p-xs text-muted">
            {user.email}
          </span>
        </span>
      </div>
      {owner ? (
        <span className="flex h-9 w-fit items-center rounded-full bg-pine-subtle px-3.5 text-label-xs font-semibold text-pine">
          {t("ownerEverywhere")}
        </span>
      ) : (
        <ul className="flex min-w-0 flex-wrap gap-2">
          {places.slice(0, PLACES_SHOWN).map(({ id, name, role }) => (
            <li key={id} className="min-w-0">
              <Link
                href={`/locations/${id}/team`}
                title={t("manageAt", { location: name })}
                className={`${place} transition-colors hover:bg-border`}
              >
                {`${name}, ${tDashboard(`roles.${role as "ADMIN"}`)}`}
              </Link>
            </li>
          ))}
          {hidden.length > 0 && (
            <li title={hidden.map(({ name }) => name).join(", ")} className={place}>
              {t("more", { count: hidden.length })}
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

// Every shop's members and open invitations, read once per request by the
// people and the invitations alike.
const getTeams = cache(async (businessId: string) => {
  const [locations, client] = await Promise.all([getBusinessLocations(businessId), api()]);
  const now = new Date();
  return Promise.all(
    locations.map(async (location) => {
      const path = { params: { path: { locationId: location.id } } };
      const [members, invitations] = await Promise.all([
        client.GET("/locations/{locationId}/memberships", path).then(pageData),
        client.GET("/locations/{locationId}/invitations", path).then(pageData),
      ]);
      const open = openInvitations(
        invitations,
        members.map(({ user }) => user.email),
        now,
      );
      return { location, members, open };
    }),
  );
});

const PEOPLE_WHILE_LOADING = 4;

// ADR 0105: who works where. A Membership is per Location (ADR 0002), so
// changing someone stays on that Location's Team page, which each place leads to.
// ADR 0119: the panels and the shops stand at once, the people wait.
export default async function BusinessTeamPage({ params }: PageProps<"/businesses/[businessId]/team">) {
  const { businessId } = await params;
  const [business, t, tTeam] = await Promise.all([
    getOwnedBusiness(businessId),
    getTranslations("business"),
    getTranslations("team"),
  ]);
  const shops = [...business.locations].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <BusinessHeader title={t("nav.team")} subtitle={business.name} />
      <div className="grid flex-1 grid-cols-1 items-start gap-4 lg:gap-5 xl:grid-cols-12">
        <Panel as="section" padding="none" className="overflow-clip xl:col-span-8">
          <Reveal
            fallback={
              <>
                <div className="px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
                  <Skeleton className="h-7 w-32" />
                </div>
                <PeopleHeader />
                <RowsPlaceholder rows={PEOPLE_WHILE_LOADING} columns={1} />
              </>
            }
          >
            <People businessId={businessId} />
          </Reveal>
        </Panel>
        <div className="flex flex-col gap-4 lg:gap-5 xl:col-span-4">
          <Panel as="section" padding="none" className="flex min-h-64 flex-col">
            <Reveal
              fallback={
                <div className="flex flex-col gap-3 px-5 pt-5 pb-5 lg:px-6 lg:pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-title-h6">{tTeam("invitations")}</h2>
                    <Skeleton className="h-10 w-28 rounded-full!" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              }
            >
              <Invitations businessId={businessId} />
            </Reveal>
          </Panel>
          {/* Straight to a shop's team, even when nobody works there yet. */}
          <Panel as="section" padding="none">
            <h2 className="px-5 pt-5 pb-2 text-title-h6 lg:px-6 lg:pt-6">{t("team.byShop")}</h2>
            <ul className="flex flex-col gap-1 px-2 pb-2 lg:px-3 lg:pb-3">
              {shops.map(({ id, name }) => (
                <li key={id}>
                  <Link
                    href={`/locations/${id}/team`}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-label-sm transition-colors hover:bg-subtle"
                  >
                    <span className="min-w-0 truncate">{name}</span>
                    <Icon name="arrow-right" className="size-2.5 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function PeopleHeader() {
  const t = useTranslations("business");
  return (
    <div className={`mx-3 hidden rounded-xl bg-subtle px-4 py-2.5 text-label-xs text-muted lg:grid ${GRID}`}>
      <span>{t("team.person")}</span>
      <span>{t("team.worksAt")}</span>
    </div>
  );
}

async function People({ businessId }: { businessId: string }) {
  const [teams, t] = await Promise.all([getTeams(businessId), getTranslations("business")]);
  const people = teamPeople(teams);
  return (
    <>
      <h2 className="px-5 pt-5 pb-4 text-title-h6 lg:px-7 lg:pt-6">{t("team.people", { count: people.length })}</h2>
      <PeopleHeader />
      <ul className="flex flex-col gap-1 p-2 lg:p-3">
        {people.map((person) => (
          <PersonRow key={person.user.id} person={person} />
        ))}
      </ul>
    </>
  );
}

async function Invitations({ businessId }: { businessId: string }) {
  const [teams, t, tTeam] = await Promise.all([
    getTeams(businessId),
    getTranslations("business"),
    getTranslations("team"),
  ]);
  const invitations = teamInvitations(teams);
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 lg:px-6 lg:pt-6">
        <h2 className="text-title-h6">{tTeam("invitations")}</h2>
        <InvitePanel
          businessId={businessId}
          locations={teams.map(({ location: { id, name, billing }, members, open }) => ({
            id,
            name,
            blocked: billing.frozen
              ? "frozen"
              : billing.memberLimit !== null && placesTaken(members.length, open) >= billing.memberLimit
                ? "full"
                : null,
          }))}
        />
      </div>
      {invitations.length > 0 ? (
        <ul className="flex flex-col gap-3 px-5 pb-5 lg:px-6">
          {invitations.map(({ email, places }) => (
            <li key={email} className="min-w-0">
              <p title={email} className="truncate text-label-sm">
                {email}
              </p>
              <p className="flex flex-wrap gap-x-3 text-p-xs">
                {places.map(({ id, name }) => (
                  <Link
                    key={id}
                    href={`/locations/${id}/team`}
                    title={t("team.manageAt", { location: name })}
                    className="text-muted underline underline-offset-4 hover:text-ink"
                  >
                    {name}
                  </Link>
                ))}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState illustration="messages" title={tTeam("noInvitations")} description={tTeam("noInvitationsHint")} />
      )}
    </>
  );
}
