"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AddShopProvider, useAddShop } from "@/components/add-shop";
import {
  NavItem,
  panelRow,
  Popover,
  SidebarFrame,
  useCollapsed,
  UserRow,
  type SidebarUser,
} from "@/components/sidebar";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { SearchField } from "@/components/ui/search-field";
import {
  businessHref,
  chooseBusiness,
  groupByBusiness,
  matchesName,
  type Membership,
  type MyBusiness,
} from "@/lib/memberships";

type Business = Pick<MyBusiness, "id" | "name" | "logoUrl">;

// A search box only earns its place once the list no longer fits a glance.
const SEARCH_FROM = 7;
// The list scrolls on its own, so the search and Add a shop stay in view.
const list = "flex max-h-72 flex-col gap-0.5 overflow-y-auto";

function PanelLink({
  href,
  current,
  avatar,
  name,
  detail,
}: {
  href: string;
  current: boolean;
  avatar: { id: string; name: string; logoUrl?: string | null };
  name: string;
  detail?: string;
}) {
  return (
    <Link
      href={href}
      title={name}
      aria-current={current ? "true" : undefined}
      className={`${panelRow} ${current ? "bg-subtle" : ""}`}
    >
      <Avatar id={avatar.id} name={avatar.name} src={avatar.logoUrl ?? null} shape="square" size="xs" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{name}</span>
        {detail && <span className="block truncate text-p-xs text-muted">{detail}</span>}
      </span>
      {current && <Icon name="check" className="size-3 shrink-0" />}
    </Link>
  );
}

// Every Business the User works at, not only the ones they own, as this is the
// only way to the Locations of another one (ADR 0104).
export function BusinessPanel({ business, memberships }: { business: Business; memberships: Membership[] }) {
  const t = useTranslations("business");
  return (
    <div className={list}>
      {groupByBusiness(memberships).map((group) => (
        <PanelLink
          key={group.business.id}
          href={businessHref(group)}
          current={group.business.id === business.id}
          avatar={group.business}
          name={group.business.name}
          detail={t("locationCount", { count: group.memberships.length })}
        />
      ))}
    </div>
  );
}

// Real links, each opens in a new tab like any link, for two Locations side by
// side (ADR 0077).
export function LocationPanel({
  memberships,
  businessId,
  currentLocationId,
  owned,
}: {
  memberships: Membership[];
  businessId: string;
  currentLocationId: string | null;
  owned: boolean;
}) {
  const t = useTranslations("dashboard");
  const addShop = useAddShop();
  const [query, setQuery] = useState("");
  const locations = groupByBusiness(memberships).find((group) => group.business.id === businessId)?.memberships ?? [];
  const shown = locations.filter(({ location }) => matchesName(location.name, query));
  // Only worth a line where it tells the shops apart.
  const sameRole = new Set(locations.map(({ role }) => role)).size === 1;
  return (
    <>
      {locations.length >= SEARCH_FROM && (
        <SearchField
          className="mb-1"
          label={t("searchLocations")}
          placeholder={t("searchLocations")}
          value={query}
          onChange={setQuery}
        />
      )}
      <div className={list}>
        {shown.map(({ location, role }) => (
          <PanelLink
            key={location.id}
            href={`/locations/${location.id}`}
            current={location.id === currentLocationId}
            avatar={location}
            name={location.name}
            detail={sameRole ? undefined : t(`roles.${role}`)}
          />
        ))}
      </div>
      {owned && (
        <>
          {locations.length > 0 && <div className="mx-1 my-2 border-t border-border" />}
          <button type="button" data-closes-popover onClick={addShop} className={`${panelRow} w-full cursor-pointer`}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-subtle">
              <Icon name="add" className="size-3" />
            </span>
            {t("addLocation")}
          </button>
        </>
      )}
    </>
  );
}

const plain = "flex h-11 min-w-0 items-center gap-2.5 px-1 text-label-md";
// One button with its chevrons inside, filled so it reads as a control on the
// white bar, and held down while its list is open. Its list is exactly as wide
// (bar-popover), so the width is fixed, not the name's.
const switcher =
  "flex h-11 min-w-0 shrink cursor-pointer items-center gap-2.5 rounded-xl bg-subtle pr-2.5 pl-2 text-label-md transition-colors hover:bg-border has-[+:popover-open]:bg-pine has-[+:popover-open]:text-surface";
const chevrons = <Icon name="sort-vertical" className="ml-auto size-3 shrink-0 opacity-70" />;

// The bar itself, also over the picker, which is above any one Business.
export function BarFrame({ nav, children }: { nav: ReactNode; children?: ReactNode }) {
  const t = useTranslations("dashboard");
  return (
    <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center justify-between gap-6 border-b border-border bg-surface px-3 md:flex">
      <nav aria-label={t("youAreHere")} className="flex min-w-0 flex-1 items-center gap-1">
        {nav}
      </nav>
      {children}
    </header>
  );
}

interface Props {
  memberships: Membership[];
  business: Business;
  // Only its Owner has pages for the Business (ADR 0002).
  owned: boolean;
  // Null on the Business's own pages.
  location: { id: string; name: string } | null;
  children?: ReactNode;
}

// ADR 0103: where you are, on every dashboard page from a tablet up. Each part
// is its own switcher, and the name of the Business leads to its pages.
export function TopBar({ memberships, business, owned, location, children }: Props) {
  const t = useTranslations("dashboard");
  const name = (
    <>
      <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" size="xs" />
      <span className="truncate">{business.name}</span>
    </>
  );
  const groups = groupByBusiness(memberships);
  const switchesBusiness = groups.some((group) => group.business.id !== business.id);
  const here = groups.find((group) => group.business.id === business.id);
  const switchesLocation = owned || (here?.memberships.length ?? 0) > 1;
  const locationName = location?.name ?? t("chooseLocation");

  return (
    <BarFrame
      nav={
        <>
          {owned || switchesBusiness ? (
            <Popover
              label={t("switchBusiness", { business: business.name })}
              popoverClass="bar-popover"
              triggerClass={`${switcher} w-60`}
              trigger={
                <>
                  {name}
                  {chevrons}
                </>
              }
            >
              <BusinessPanel business={business} memberships={memberships} />
            </Popover>
          ) : (
            <span className={plain}>{name}</span>
          )}
          <span aria-hidden="true" className="px-0.5 text-title-h6 font-normal text-border-strong">
            /
          </span>
          {switchesLocation ? (
            <Popover
              label={t("switchLocation", { location: locationName })}
              popoverClass="bar-popover"
              triggerClass={`${switcher} w-52`}
              trigger={
                <>
                  <span className="truncate pl-1">{locationName}</span>
                  {chevrons}
                </>
              }
            >
              <LocationPanel
                memberships={memberships}
                businessId={business.id}
                currentLocationId={location?.id ?? null}
                owned={owned}
              />
            </Popover>
          ) : (
            <span className={plain}>
              <span className="truncate">{locationName}</span>
            </span>
          )}
        </>
      }
    >
      {children}
    </BarFrame>
  );
}

// The picker's Business is in its URL, which a layout can't read. Same frame as
// every other page, so a link with ?business= never loses the navigation.
export function PickerFrame({
  me,
  memberships,
  collapsed: initial,
  children,
}: {
  me: SidebarUser;
  memberships: Membership[];
  collapsed: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("business");
  const tDashboard = useTranslations("dashboard");
  const [collapsed, toggle] = useCollapsed(initial);
  const businessId = useSearchParams().get("business");
  const chosen = chooseBusiness(groupByBusiness(memberships), businessId);
  return (
    <AddShopProvider businessId={chosen?.business.id ?? ""}>
      {chosen && <TopBar memberships={memberships} business={chosen.business} owned={chosen.owned} location={null} />}
      <div className="flex min-w-0 flex-1">
        {chosen && (
          <SidebarFrame collapsed={collapsed} onToggle={toggle}>
            <nav className="flex flex-1 flex-col">
              <NavItem href={businessHref(chosen)} icon="home" label={t("nav.locations")} current />
            </nav>
            <UserRow me={me} detail={tDashboard(`roles.${chosen.memberships[0].role}`)} />
          </SidebarFrame>
        )}
        {children}
      </div>
    </AddShopProvider>
  );
}
