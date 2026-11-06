"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, type ReactNode } from "react";
import {
  CollapsedContext,
  NavItem,
  panelRow,
  Popover,
  rowClass,
  SidebarFrame,
  useCollapsed,
  UserPanel,
  UserRow,
  wide,
  type SidebarUser,
} from "@/components/sidebar";
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";

const SECTIONS = [
  { slug: "", key: "overview", icon: "dashboard" },
  { slug: "/billing", key: "billing", icon: "receipt" },
  { slug: "/settings", key: "settings", icon: "settings" },
] as const satisfies readonly { slug: string; key: string; icon: IconName }[];

interface Business {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface Props {
  me: SidebarUser;
  business: Business;
  locations: { id: string; name: string }[];
  otherBusinesses: Business[];
  showAllLocations: boolean;
  // Locations whose plan has stopped them, or whose payment failed.
  billingAlerts: number;
}

function BusinessName({ props, collapsed }: { props: Props; collapsed?: boolean }) {
  const t = useTranslations("business");
  const { business, locations } = props;
  return (
    <>
      <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" />
      <span className={`min-w-0 flex-1 ${collapsed === undefined ? "" : wide(collapsed)}`}>
        <span className="block truncate text-label-sm">{business.name}</span>
        <span className="block truncate text-p-xs text-muted">{t("locationCount", { count: locations.length })}</span>
      </span>
    </>
  );
}

function BusinessPanel({ props }: { props: Props }) {
  const t = useTranslations("dashboard");
  return (
    <>
      <div className={`${panelRow} justify-between hover:bg-transparent`}>
        <span className="min-w-0 wrap-anywhere">{props.business.name}</span>
        <Icon name="check" className="size-3 shrink-0" />
      </div>
      {props.otherBusinesses.map((business) => (
        <Link key={business.id} href={`/businesses/${business.id}`} className={panelRow}>
          <span className="min-w-0 wrap-anywhere">{business.name}</span>
        </Link>
      ))}
      {props.showAllLocations && (
        <>
          <div className="mx-3 my-2 border-t border-border" />
          <Link href="/" className={panelRow}>
            <Icon name="layers" className="size-4 text-muted" />
            {t("allLocations")}
          </Link>
        </>
      )}
    </>
  );
}

function useSections(businessId: string) {
  const pathname = usePathname();
  return SECTIONS.map((section) => {
    const href = `/businesses/${businessId}${section.slug}`;
    return { ...section, href, current: pathname === href };
  });
}

function NavLinks({ props }: { props: Props }) {
  const t = useTranslations("business");
  const tDashboard = useTranslations("dashboard");
  const pathname = usePathname();
  const collapsed = useContext(CollapsedContext);
  const addHref = `/businesses/${props.business.id}/locations/new`;
  return (
    <nav aria-label={tDashboard("navigation")} className="flex min-h-0 flex-1 flex-col gap-0.5 roomy:gap-1">
      {useSections(props.business.id).map(({ key, icon, href, current }) => (
        <NavItem
          key={key}
          href={href}
          icon={icon}
          label={t(`nav.${key}`)}
          current={current}
          badge={key === "billing" ? props.billingAlerts : undefined}
          alert
        />
      ))}
      <p className={`mt-3 mb-0.5 px-3 text-label-sm roomy:mt-4 roomy:mb-1 ${wide(collapsed)}`}>{t("nav.locations")}</p>
      <div className={`mx-2 my-2 border-t border-border ${collapsed ? "" : "xl:hidden"}`} />
      {/* The list scrolls by itself, so a chain's Locations can't push the
          rest of the sidebar away. */}
      <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none] roomy:gap-1">
        {props.locations.map(({ id, name }) => (
          <NavItem
            key={id}
            href={`/locations/${id}`}
            leading={<Avatar id={id} name={name} src={null} size="xs" />}
            label={name}
            current={false}
          />
        ))}
      </div>
      <NavItem href={addHref} icon="add" label={t("nav.add")} current={pathname === addHref} />
    </nav>
  );
}

function PhoneBar({ props }: { props: Props }) {
  const t = useTranslations("dashboard");
  const { me } = props;
  return (
    <div className="relative flex items-center justify-between gap-2 px-4 pt-3 md:hidden">
      <div className="min-w-0 flex-1">
        <Popover
          label={t("switchLocation", { location: props.business.name })}
          popoverClass="switcher-popover"
          triggerClass="flex min-h-11 max-w-full cursor-pointer items-center gap-2.5 text-left"
          trigger={
            <>
              <BusinessName props={props} />
              <Icon name="arrow-down-1" className="size-2.5 shrink-0 text-muted" />
            </>
          }
        >
          <BusinessPanel props={props} />
        </Popover>
      </div>
      <Popover
        label={me.name}
        popoverClass="menu-popover w-80 max-w-[calc(100vw-2rem)]"
        triggerClass="cursor-pointer rounded-full"
        trigger={<Avatar id={me.id} name={me.name} src={me.avatarUrl} />}
      >
        <UserPanel me={me} role="OWNER" />
      </Popover>
    </div>
  );
}

function BottomNav({ businessId }: { businessId: string }) {
  const t = useTranslations("business");
  const tDashboard = useTranslations("dashboard");
  const [overview, billing, settings] = useSections(businessId);
  const item = ({ key, icon, href, current }: typeof overview) => (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs leading-4 font-semibold ${
        current ? "text-ink" : "text-muted"
      }`}
    >
      <Icon name={icon} className="size-5" />
      <span className="max-w-full truncate">{t(`nav.${key}`)}</span>
    </Link>
  );
  return (
    <nav
      aria-label={tDashboard("navigation")}
      className="fixed inset-x-0 bottom-0 z-20 flex h-[4.5rem] items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {item(overview)}
      {item(billing)}
      <div className="flex flex-1 items-center justify-center">
        <Link
          href={`/businesses/${businessId}/locations/new`}
          aria-label={tDashboard("addLocation")}
          className="flex size-13 items-center justify-center rounded-full bg-pine text-brand active:scale-[0.97]"
        >
          <Icon name="add" className="size-5" />
        </Link>
      </div>
      {item(settings)}
    </nav>
  );
}

export function BusinessNav({
  collapsed: initial,
  children,
  ...props
}: Props & { collapsed: boolean; children: ReactNode }) {
  const t = useTranslations("dashboard");
  const [collapsed, toggle] = useCollapsed(initial);
  return (
    <>
      <SidebarFrame collapsed={collapsed} onToggle={toggle}>
        <CollapsedContext.Provider value={collapsed}>
          <Popover
            label={t("switchLocation", { location: props.business.name })}
            popoverClass="switcher-popover"
            triggerClass={rowClass(collapsed)}
            trigger={
              <>
                <BusinessName props={props} collapsed={collapsed} />
                <Icon name="arrow-down-1" className={`mr-1 size-2.5 shrink-0 text-muted ${wide(collapsed)}`} />
              </>
            }
          >
            <BusinessPanel props={props} />
          </Popover>
          <NavLinks props={props} />
          <UserRow me={props.me} role="OWNER" />
        </CollapsedContext.Provider>
      </SidebarFrame>
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        <PhoneBar props={props} />
        <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-3 md:px-5 md:py-4 lg:gap-5 lg:px-7 lg:py-5">
          {children}
        </main>
      </div>
      <BottomNav businessId={props.business.id} />
    </>
  );
}
