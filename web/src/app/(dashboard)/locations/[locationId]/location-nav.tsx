"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { Menu } from "@/components/ui/menu";
import { groupByBusiness, type Membership } from "@/lib/memberships";
import { HeaderSearch } from "./header-search";
import { useLocationActions } from "./location-actions";
import { isManager, SECTIONS, SIDEBAR_COOKIE, type Section } from "./sections";

const YEAR_SECONDS = 365 * 24 * 60 * 60;
const TRIAL_DAYS = 14;
const URGENT_TRIAL_DAYS = 3;

// Whether the sidebar shows its words. Under 1280px it's always the rail.
const CollapsedContext = createContext(false);
const wide = (collapsed: boolean) => (collapsed ? "hidden" : "hidden xl:block");

function useSectionHref(locationId: string) {
  return ({ slug }: Section) => `/locations/${locationId}${slug ? `/${slug}` : ""}`;
}

function isCurrent(pathname: string, href: string, slug: string) {
  return slug ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
}

function NavItem({
  href,
  icon,
  label,
  current,
  badge,
  alert,
}: {
  href: string;
  icon: IconName;
  label: string;
  current: boolean;
  badge?: number;
  alert?: boolean;
}) {
  const collapsed = useContext(CollapsedContext);
  const badgeTone = alert ? "bg-danger text-surface" : "bg-brand text-ink";
  return (
    <Link
      href={href}
      title={label}
      aria-current={current ? "page" : undefined}
      className={`relative mx-auto flex h-10 w-10 shrink-0 items-center justify-center gap-3 rounded-full text-label-md transition-colors roomy:h-12 ${
        collapsed ? "roomy:w-12" : "max-xl:roomy:w-12 xl:mx-0 xl:w-full xl:justify-start xl:rounded-2xl xl:px-3"
      } ${current ? "bg-pine text-surface" : "text-muted hover:bg-subtle hover:text-ink"}`}
    >
      <Icon name={icon} className={`size-5 shrink-0 ${current ? "text-brand" : ""}`} />
      <span className={`min-w-0 flex-1 truncate ${wide(collapsed)}`}>{label}</span>
      {badge ? (
        <>
          <span
            className={`h-6 min-w-6 rounded-full px-1.5 text-center text-label-xs leading-6 font-bold ${badgeTone} ${wide(collapsed)}`}
          >
            {badge}
          </span>
          <span
            aria-hidden="true"
            className={`absolute -top-1 -right-1.5 h-5 min-w-5 rounded-full px-1 text-center text-xs leading-5 font-bold ring-2 ring-surface ${badgeTone} ${
              collapsed ? "" : "xl:hidden"
            }`}
          >
            {badge}
          </span>
        </>
      ) : null}
    </Link>
  );
}

// A button and the browser's own popover under it, anchored through the CSSOM,
// which the CSP allows (ADR 0048). Real links stay real: each opens in a new
// tab like any link, for two Locations side by side.
function Popover({
  label,
  popoverClass,
  triggerClass,
  trigger,
  children,
}: {
  label: string;
  popoverClass: string;
  triggerClass: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const name = `--popover-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
    button.current?.style.setProperty("anchor-name", name);
    panel.current?.style.setProperty("position-anchor", name);
  }, [id]);

  return (
    <>
      <button ref={button} type="button" popoverTarget={id} aria-label={label} className={triggerClass}>
        {trigger}
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        onClick={(event) => {
          if ((event.target as Element).closest("a")) panel.current!.hidePopover();
        }}
        className={`${popoverClass} max-h-[80dvh] overflow-y-auto rounded-card border border-border-strong bg-surface p-2 text-ink`}
      >
        {children}
      </div>
    </>
  );
}

// The Location and the User share the nav items' shape, corners and hover, so
// the sidebar reads as one list, not as cards placed on it.
function rowClass(collapsed: boolean) {
  return `flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl py-1.5 text-left transition-colors hover:bg-subtle ${
    collapsed ? "" : "xl:justify-start xl:px-2"
  }`;
}

const panelRow =
  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-label-sm transition-colors hover:bg-subtle";

function LocationPanel({ memberships, current }: { memberships: Membership[]; current: Membership }) {
  const t = useTranslations("dashboard");
  const owned = current.role === "OWNER";
  return (
    <>
      {groupByBusiness(memberships).map(({ business, memberships: group }) => (
        <div key={business.id} className="mb-1">
          <p className="px-3 pt-2 pb-1 text-label-xs wrap-anywhere text-muted">{business.name}</p>
          {group.map(({ location }) => (
            <Link
              key={location.id}
              href={`/locations/${location.id}`}
              aria-current={location.id === current.location.id ? "page" : undefined}
              className={`${panelRow} justify-between`}
            >
              <span className="min-w-0 wrap-anywhere">{location.name}</span>
              {location.id === current.location.id && <Icon name="check" className="size-3 shrink-0" />}
            </Link>
          ))}
        </div>
      ))}
      <div className="mx-3 my-2 border-t border-border" />
      {memberships.length > 1 && (
        <Link href="/" className={panelRow}>
          <Icon name="layers" className="size-4 text-muted" />
          {t("allLocations")}
        </Link>
      )}
      {owned && (
        <>
          <Link href={`/businesses/${current.location.business.id}/locations/new`} className={panelRow}>
            <Icon name="add" className="size-4 text-muted" />
            {t("addLocation")}
          </Link>
          <Link href={`/businesses/${current.location.business.id}`} className={panelRow}>
            <Icon name="home" className="size-4 text-muted" />
            {t("businessSettings")}
          </Link>
        </>
      )}
    </>
  );
}

function LocationName({ current, collapsed }: { current: Membership; collapsed?: boolean }) {
  const { name, business } = current.location;
  return (
    <>
      <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" />
      <span className={`min-w-0 flex-1 ${collapsed === undefined ? "" : wide(collapsed)}`}>
        <span className="block truncate text-label-sm">{name}</span>
        <span className="block truncate text-p-xs text-muted">{business.name}</span>
      </span>
    </>
  );
}

// Only a menu with something in it: a one-Location Employee has nowhere to go.
function LocationRow({ memberships, current }: { memberships: Membership[]; current: Membership }) {
  const t = useTranslations("dashboard");
  const collapsed = useContext(CollapsedContext);
  if (memberships.length === 1 && current.role !== "OWNER") {
    return (
      <div className={rowClass(collapsed).replace("cursor-pointer", "").replace("hover:bg-subtle", "")}>
        <LocationName current={current} collapsed={collapsed} />
      </div>
    );
  }
  return (
    <Popover
      label={t("switchLocation", { location: current.location.name })}
      popoverClass="switcher-popover"
      triggerClass={rowClass(collapsed)}
      trigger={
        <>
          <LocationName current={current} collapsed={collapsed} />
          <Icon name="arrow-down-1" className={`mr-1 size-2.5 shrink-0 text-muted ${wide(collapsed)}`} />
        </>
      }
    >
      <LocationPanel memberships={memberships} current={current} />
    </Popover>
  );
}

type Me = Props["me"];

function UserPanel({ me, role }: { me: Me; role: string }) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const locale = useLocale();
  return (
    <>
      <div className="flex items-center gap-3 px-3 pt-2 pb-3">
        <Avatar id={me.id} name={me.name} src={me.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-label-md">{me.name}</p>
          <p className="truncate text-p-xs text-muted" title={me.email}>
            {me.email}
          </p>
          <p className="text-p-xs text-muted">{t(`roles.${role as "OWNER"}`)}</p>
        </div>
      </div>
      <div className="mx-3 border-t border-border" />
      <div className="p-3">
        <p className="mb-2 flex items-center gap-2 text-label-sm">
          <Icon name="globe" className="size-4 text-muted" />
          {t("language")}
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-subtle p-1">
          {(
            [
              ["en", "English"],
              ["fr", "Français"],
            ] as const
          ).map(([code, label]) => (
            // A full load, the proxy keeps the choice in its cookie (ADR 0047).
            <a
              key={code}
              href={`${pathname}?lang=${code}`}
              aria-current={locale === code ? "true" : undefined}
              className={`flex h-10 items-center justify-center rounded-lg text-label-xs font-semibold transition-colors ${
                locale === code ? "bg-pine text-surface" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
      <div className="mx-3 mb-1 border-t border-border" />
      <SignOutButton row />
    </>
  );
}

function UserRow({ me, role }: { me: Me; role: string }) {
  const t = useTranslations("dashboard");
  const collapsed = useContext(CollapsedContext);
  return (
    <Popover
      label={me.name}
      popoverClass="user-popover"
      triggerClass={rowClass(collapsed)}
      trigger={
        <>
          <Avatar id={me.id} name={me.name} src={me.avatarUrl} />
          <span className={`min-w-0 flex-1 ${wide(collapsed)}`}>
            <span className="block truncate text-label-sm">{me.name}</span>
            <span className="block truncate text-p-xs text-muted">{t(`roles.${role as "OWNER"}`)}</span>
          </span>
          <Icon name="arrow-down-1" className={`mr-1 size-2.5 shrink-0 rotate-180 text-muted ${wide(collapsed)}`} />
        </>
      }
    >
      <UserPanel me={me} role={role} />
    </Popover>
  );
}

// Says what it costs and what happens, and goes straight to choosing a plan: its
// job is getting a Location paid, not just reminding (ADR 0087).
function TrialCard({ daysLeft }: { daysLeft: number }) {
  const t = useTranslations("plans");
  const { choosePlan } = useLocationActions();
  const collapsed = useContext(CollapsedContext);
  const urgent = daysLeft <= URGENT_TRIAL_DAYS;
  const title = daysLeft === 0 ? t("ended") : t("daysLeft", { days: daysLeft });
  return (
    <>
      <div className={`on-pine rounded-card p-3.5 text-surface ${urgent ? "bg-danger" : "bg-pine"} ${wide(collapsed)}`}>
        <p className="text-label-sm">{title}</p>
        <div aria-hidden="true" className="mt-2 flex gap-0.5">
          {Array.from({ length: TRIAL_DAYS }, (_, day) => (
            <span
              key={day}
              className={`h-1.5 flex-1 rounded-full ${
                day < TRIAL_DAYS - daysLeft ? "bg-surface/25" : urgent ? "bg-surface" : "bg-brand"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-p-xs">{t(daysLeft === 0 ? "endedBody" : "cardBody")}</p>
        <button
          type="button"
          onClick={choosePlan}
          className={`mt-3 flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full px-3 text-label-xs font-bold text-ink transition-[background-color,scale] active:scale-[0.97] ${
            urgent ? "bg-surface hover:bg-subtle" : "bg-brand hover:bg-brand-hover"
          }`}
        >
          {t(daysLeft === 0 ? "choosePlan" : "keepPro")}
        </button>
      </div>
      <button
        type="button"
        aria-label={title}
        title={title}
        onClick={choosePlan}
        className={`mx-auto size-11 cursor-pointer items-center justify-center rounded-full text-label-xs font-bold ${
          urgent ? "bg-danger text-surface" : "bg-brand text-ink"
        } ${collapsed ? "flex" : "flex xl:hidden"}`}
      >
        {daysLeft === 0 ? "!" : t("daysShort", { days: daysLeft })}
      </button>
    </>
  );
}

function NavLinks({ props }: { props: Props }) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const collapsed = useContext(CollapsedContext);
  const href = useSectionHref(props.current.location.id);
  const link = (section: Section) => (
    <NavItem
      key={section.key}
      href={href(section)}
      icon={section.icon}
      label={t(`sections.${section.key}`)}
      current={isCurrent(pathname, href(section), section.slug)}
      badge={
        section.key === "tickets" ? props.openTickets : section.key === "feedback" ? props.unhandledFeedback : undefined
      }
      alert={section.key === "feedback"}
    />
  );
  return (
    <nav aria-label={t("navigation")} className="flex flex-1 flex-col gap-0.5 roomy:gap-1">
      {SECTIONS.filter((section) => !section.managers).map(link)}
      {isManager(props.current.role) && (
        <>
          <p className={`mt-3 mb-0.5 px-3 text-label-sm roomy:mt-4 roomy:mb-1 ${wide(collapsed)}`}>{t("manage")}</p>
          <div className={`mx-2 my-2 border-t border-border ${collapsed ? "" : "xl:hidden"}`} />
          {SECTIONS.filter((section) => section.managers).map(link)}
        </>
      )}
    </nav>
  );
}

function Sidebar({ props, collapsed, onToggle }: { props: Props; collapsed: boolean; onToggle: () => void }) {
  const t = useTranslations("dashboard");
  return (
    <CollapsedContext.Provider value={collapsed}>
      <aside
        className={`relative z-20 hidden min-h-dvh w-20 shrink-0 flex-col gap-3 border-r border-border bg-surface px-3 py-3 transition-[width] md:flex tall:sticky tall:top-0 tall:h-dvh tall:self-start roomy:gap-4 roomy:py-4 ${
          collapsed ? "" : "xl:w-64 xl:px-4"
        }`}
      >
        <LocationRow memberships={props.memberships} current={props.current} />
        <NavLinks props={props} />
        {props.trialDaysLeft !== null && <TrialCard daysLeft={props.trialDaysLeft} />}
        <UserRow me={props.me} role={props.current.role} />
        {/* On the sidebar's edge, where it takes no row and reads as moving
            that edge. Under 1280px the sidebar is always the rail. */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={t(collapsed ? "expandSidebar" : "collapseSidebar")}
          title={t(collapsed ? "expandSidebar" : "collapseSidebar")}
          aria-expanded={!collapsed}
          className="absolute top-8 -right-3.5 hidden size-7 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface text-muted transition-colors hover:bg-subtle hover:text-ink xl:flex"
        >
          <Icon name={collapsed ? "arrow-right" : "arrow-left-1"} className="size-2.5" />
        </button>
      </aside>
    </CollapsedContext.Provider>
  );
}

function PhoneBar({ props }: { props: Props }) {
  const t = useTranslations("dashboard");
  const { current, memberships, me } = props;
  const single = memberships.length === 1 && current.role !== "OWNER";
  return (
    <div className="relative flex items-center justify-between gap-2 px-4 pt-3 md:hidden">
      <div className="min-w-0 flex-1">
        {single ? (
          <div className="flex items-center gap-2.5">
            <LocationName current={current} />
          </div>
        ) : (
          <Popover
            label={t("switchLocation", { location: current.location.name })}
            popoverClass="switcher-popover"
            triggerClass="flex min-h-11 max-w-full cursor-pointer items-center gap-2.5 text-left"
            trigger={
              <>
                <LocationName current={current} />
                <Icon name="arrow-down-1" className="size-2.5 shrink-0 text-muted" />
              </>
            }
          >
            <LocationPanel memberships={memberships} current={current} />
          </Popover>
        )}
      </div>
      <HeaderSearch locationId={current.location.id} compact />
      <Popover
        label={me.name}
        popoverClass="menu-popover w-80 max-w-[calc(100vw-2rem)]"
        triggerClass="cursor-pointer rounded-full"
        trigger={<Avatar id={me.id} name={me.name} src={me.avatarUrl} />}
      >
        <UserPanel me={me} role={current.role} />
      </Popover>
    </div>
  );
}

function BottomNav({ props }: { props: Props }) {
  const t = useTranslations("dashboard");
  const tTickets = useTranslations("tickets");
  const pathname = usePathname();
  const router = useRouter();
  const { newTicket } = useLocationActions();
  const href = useSectionHref(props.current.location.id);
  const [today, tickets, customers] = SECTIONS;
  const item = (section: Section) => {
    const current = isCurrent(pathname, href(section), section.slug);
    return (
      <Link
        href={href(section)}
        aria-current={current ? "page" : undefined}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs leading-4 font-semibold ${
          current ? "text-ink" : "text-muted"
        }`}
      >
        <Icon name={section.icon} className="size-5" />
        <span className="max-w-full truncate">{t(`sections.${section.key}`)}</span>
      </Link>
    );
  };
  return (
    <nav
      aria-label={t("navigation")}
      className="fixed inset-x-0 bottom-0 z-20 flex h-[4.5rem] items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {item(today)}
      {item(tickets)}
      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          aria-label={tTickets("new")}
          onClick={newTicket}
          className="flex size-13 cursor-pointer items-center justify-center rounded-full bg-pine text-brand active:scale-[0.97]"
        >
          <Icon name="add" className="size-5" />
        </button>
      </div>
      {item(customers)}
      {isManager(props.current.role) ? (
        <Menu
          label={t("more")}
          triggerClassName="flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-xs leading-4 font-semibold text-muted"
          trigger={
            <>
              <Icon name="more-hor" className="size-5" />
              {t("more")}
            </>
          }
          items={SECTIONS.filter((section) => section.managers).map((section) => ({
            label: t(`sections.${section.key}`),
            icon: section.icon,
            onSelect: () => router.push(href(section)),
          }))}
        />
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}

interface Props {
  me: { name: string; email: string; id: string; avatarUrl: string | null };
  memberships: Membership[];
  current: Membership;
  openTickets: number;
  unhandledFeedback: number;
  // Null when there's no plan to choose, or this Role can't choose one.
  trialDaysLeft: number | null;
}

// ADR 0087: a white sidebar that collapses to a rail, always the rail under
// 1280px, and a bar and bottom navigation on a phone. The choice is in a cookie,
// so the server draws it right the first time.
export function LocationNav({
  collapsed: initial,
  children,
  ...props
}: Props & { collapsed: boolean; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(initial);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
  }

  return (
    <>
      <Sidebar props={props} collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        <PhoneBar props={props} />
        <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-3 md:px-5 md:py-4 lg:gap-5 lg:px-7 lg:py-5">
          {children}
        </main>
      </div>
      <BottomNav props={props} />
    </>
  );
}
