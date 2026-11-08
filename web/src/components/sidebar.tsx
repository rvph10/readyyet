"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

const YEAR_SECONDS = 365 * 24 * 60 * 60;

export interface SidebarUser {
  name: string;
  email: string;
  id: string;
  avatarUrl: string | null;
  platformAdmin: boolean;
  salesPartnerPage: boolean;
}

// Whether the sidebar shows its words. Under 1280px it's always the rail.
export const CollapsedContext = createContext(false);
export const wide = (collapsed: boolean) => (collapsed ? "hidden" : "hidden xl:block");

export function NavItem({
  href,
  icon,
  leading,
  label,
  current,
  badge,
  alert,
}: {
  href: string;
  icon?: IconName;
  // In the icon's place, for what an icon can't tell apart.
  leading?: ReactNode;
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
      {leading ?? <Icon name={icon!} className={`size-5 shrink-0 ${current ? "text-brand" : ""}`} />}
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
export function Popover({
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
          if ((event.target as Element).closest("a, [data-closes-popover]")) panel.current!.hidePopover();
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
export function rowClass(collapsed: boolean) {
  return `flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl py-1.5 text-left transition-colors hover:bg-subtle ${
    collapsed ? "" : "xl:justify-start xl:px-2"
  }`;
}

export const panelRow =
  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-label-sm transition-colors hover:bg-subtle";

// detail is the line under the name: their Role where they are.
export function UserPanel({ me, detail }: { me: SidebarUser; detail: string }) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const search = useSearchParams();
  const locale = useLocale();
  // The page's own query stays, or changing language would leave ?section= behind.
  const inLanguage = (lang: string) => {
    const query = new URLSearchParams(search);
    query.set("lang", lang);
    return `${pathname}?${query}`;
  };
  return (
    <>
      <div className="flex items-center gap-3 px-3 pt-2 pb-3">
        <Avatar id={me.id} name={me.name} src={me.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-label-md">{me.name}</p>
          <p className="truncate text-p-xs text-muted" title={me.email}>
            {me.email}
          </p>
          <p className="text-p-xs text-muted">{detail}</p>
        </div>
      </div>
      <div className="mx-3 border-t border-border" />
      {(me.platformAdmin || me.salesPartnerPage) && (
        <>
          <div className="p-1">
            {me.salesPartnerPage && (
              <Link href="/partner" className={panelRow}>
                <Icon name="link" className="size-4 text-muted" />
                {t("salesPartnerPage")}
              </Link>
            )}
            {me.platformAdmin && (
              <Link href="/admin" className={panelRow}>
                <Icon name="layers" className="size-4 text-muted" />
                {t("backOffice")}
              </Link>
            )}
          </div>
          <div className="mx-3 border-t border-border" />
        </>
      )}
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
              href={inLanguage(code)}
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

export function UserRow({ me, detail }: { me: SidebarUser; detail: string }) {
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
            <span className="block truncate text-p-xs text-muted">{detail}</span>
          </span>
          <Icon name="arrow-down-1" className={`mr-1 size-2.5 shrink-0 rotate-180 text-muted ${wide(collapsed)}`} />
        </>
      }
    >
      <UserPanel me={me} detail={detail} />
    </Popover>
  );
}

// The choice is in a cookie, so the server draws it right the first time.
export function useCollapsed(initial: boolean) {
  const [collapsed, setCollapsed] = useState(initial);
  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
  }
  return [collapsed, toggle] as const;
}

// ADR 0087: a white sidebar that collapses to a rail, and is always the rail
// under 1280px. A Location's and a Business's share it (ADR 0102).
export function SidebarFrame({
  collapsed,
  onToggle,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("dashboard");
  return (
    <CollapsedContext.Provider value={collapsed}>
      <aside
        className={`relative z-20 hidden min-h-[calc(100dvh-4rem)] w-20 shrink-0 flex-col gap-3 border-r border-border bg-surface px-3 py-3 transition-[width] md:flex tall:sticky tall:top-16 tall:h-[calc(100dvh-4rem)] tall:self-start roomy:gap-4 roomy:py-4 ${
          collapsed ? "" : "xl:w-64 xl:px-4"
        }`}
      >
        {children}
        {/* On the sidebar's edge, where it takes no row and reads as moving
            that edge. Under 1280px the sidebar is always the rail. */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={t(collapsed ? "expandSidebar" : "collapseSidebar")}
          title={t(collapsed ? "expandSidebar" : "collapseSidebar")}
          aria-expanded={!collapsed}
          className="absolute top-5 -right-3.5 hidden size-7 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface text-muted transition-colors hover:bg-subtle hover:text-ink xl:flex"
        >
          <Icon name={collapsed ? "arrow-right" : "arrow-left-1"} className="size-2.5" />
        </button>
      </aside>
    </CollapsedContext.Provider>
  );
}
