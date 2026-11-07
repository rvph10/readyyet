"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  NavItem,
  Popover,
  SidebarFrame,
  useCollapsed,
  UserPanel,
  UserRow,
  type SidebarUser,
} from "@/components/sidebar";
import { AddShopProvider, useAddShop } from "@/components/add-shop";
import { InviteBusiness, InviteDialog, InviteRow } from "@/components/invite-business";
import { BusinessPanel, TopBar } from "@/components/top-bar";
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import type { Membership } from "@/lib/memberships";
import { BusinessNameContext } from "./business-crumbs";

const SECTIONS = [
  { slug: "", key: "locations", icon: "home" },
  { slug: "/team", key: "team", icon: "id-card" },
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
  memberships: Membership[];
  locationCount: number;
  // Locations whose plan has stopped them, or whose payment failed.
  billingAlerts: number;
  inviteLink: string;
}

function BusinessName({ props }: { props: Props }) {
  const t = useTranslations("business");
  const { business, locationCount } = props;
  return (
    <>
      <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-sm">{business.name}</span>
        <span className="block truncate text-p-xs text-muted">{t("locationCount", { count: locationCount })}</span>
      </span>
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
  return (
    <nav aria-label={tDashboard("navigation")} className="flex flex-1 flex-col gap-0.5 roomy:gap-1">
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
    </nav>
  );
}

function PhoneBar({ props }: { props: Props }) {
  const t = useTranslations("dashboard");
  const { me } = props;
  const [inviting, setInviting] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3 md:hidden">
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
          <BusinessPanel business={props.business} memberships={props.memberships} />
        </Popover>
      </div>
      <Popover
        label={me.name}
        popoverClass="menu-popover w-80 max-w-[calc(100vw-2rem)]"
        triggerClass="cursor-pointer rounded-full"
        trigger={<Avatar id={me.id} name={me.name} src={me.avatarUrl} />}
      >
        <InviteRow onOpen={() => setInviting(true)} />
        <UserPanel me={me} role="OWNER" />
      </Popover>
      <InviteDialog link={props.inviteLink} open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

function BottomNav({ businessId }: { businessId: string }) {
  const t = useTranslations("business");
  const tDashboard = useTranslations("dashboard");
  const addShop = useAddShop();
  const [locations, team, billing, settings] = useSections(businessId);
  const item = ({ key, icon, href, current }: typeof locations) => (
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
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/* Its own height: the inset changes as Safari's toolbar hides, and taken
          from a fixed height it would squeeze what's in the bar. */}
      <div className="flex h-[4.5rem] items-stretch">
        {item(locations)}
        {item(team)}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label={tDashboard("addLocation")}
            onClick={addShop}
            className="flex size-13 cursor-pointer items-center justify-center rounded-full bg-pine text-brand active:scale-[0.97]"
          >
            <Icon name="add" className="size-5" />
          </button>
        </div>
        {item(billing)}
        {item(settings)}
      </div>
    </nav>
  );
}

export function BusinessNav({
  collapsed: initial,
  children,
  ...props
}: Props & { collapsed: boolean; children: ReactNode }) {
  const [collapsed, toggle] = useCollapsed(initial);
  return (
    <BusinessNameContext.Provider value={props.business.name}>
      <AddShopProvider businessId={props.business.id}>
        <TopBar memberships={props.memberships} business={props.business} owned location={null} />
        <div className="flex min-w-0 flex-1">
          <SidebarFrame collapsed={collapsed} onToggle={toggle}>
            <NavLinks props={props} />
            <InviteBusiness link={props.inviteLink} />
            <UserRow me={props.me} role="OWNER" />
          </SidebarFrame>
          <div className="flex min-w-0 flex-1 flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
            <PhoneBar props={props} />
            <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-3 md:px-5 md:py-4 lg:gap-5 lg:px-7 lg:py-5">
              {children}
            </main>
          </div>
        </div>
        <BottomNav businessId={props.business.id} />
      </AddShopProvider>
    </BusinessNameContext.Provider>
  );
}
