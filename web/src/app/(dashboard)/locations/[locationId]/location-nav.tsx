"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon, type IconName } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { groupByBusiness, type Membership } from "@/lib/memberships";
import { isManager, SECTIONS } from "./sections";

const ITEM = "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-label-sm transition-colors";

function NavLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  const current = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`${ITEM} ${current ? "bg-subtle text-ink" : "text-muted hover:bg-subtle hover:text-ink"}`}
    >
      <Icon name={icon} className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

function LocationName({ membership }: { membership: Membership }) {
  const { name, business } = membership.location;
  return (
    <>
      <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" />
      <span className="min-w-0 flex-1 text-left">
        <span className="line-clamp-2 text-label-sm wrap-anywhere">{name}</span>
        <span className="line-clamp-1 text-p-xs wrap-anywhere text-muted">{business.name}</span>
      </span>
    </>
  );
}

// Real links in the browser's own popover, not a menu of actions: each opens
// in a new tab like any link, for two Locations side by side. Only there with
// a choice to make, which also keeps a one-Location User from seeing an arrow
// that leads nowhere.
function LocationSwitcher({ memberships, current }: { memberships: Membership[]; current: Membership }) {
  const t = useTranslations("dashboard");
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // Set through the CSSOM, which the CSP allows (ADR 0048), see Menu.
  useEffect(() => {
    const name = `--switcher-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
    button.current?.style.setProperty("anchor-name", name);
    list.current?.style.setProperty("position-anchor", name);
  }, [id]);

  if (memberships.length === 1) {
    return (
      <div className="flex items-center gap-3 p-2">
        <LocationName membership={current} />
      </div>
    );
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        popoverTarget={id}
        aria-label={t("switchLocation", { location: current.location.name })}
        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-subtle"
      >
        <LocationName membership={current} />
        <Icon name="arrow-down-1" className="size-3 shrink-0 text-muted" />
      </button>
      <div
        ref={list}
        id={id}
        popover="auto"
        onClick={(event) => {
          if ((event.target as Element).closest("a")) list.current!.hidePopover();
        }}
        className="switcher-popover max-h-[70dvh] overflow-y-auto rounded-xl border border-border bg-surface p-1 text-ink shadow-float"
      >
        {groupByBusiness(memberships).map(({ business, memberships: group }) => (
          <div key={business.id} className="mb-1">
            <p className="px-3 pt-2 pb-1 text-label-xs wrap-anywhere text-muted">{business.name}</p>
            {group.map(({ location }) => (
              <Link
                key={location.id}
                href={`/locations/${location.id}`}
                aria-current={location.id === current.location.id ? "page" : undefined}
                className="flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-label-sm transition-colors hover:bg-subtle"
              >
                <span className="min-w-0 wrap-anywhere">{location.name}</span>
                {location.id === current.location.id && <Icon name="check" className="size-3 shrink-0" />}
              </Link>
            ))}
          </div>
        ))}
        <div className="border-t border-border pt-1">
          <Link
            href="/"
            className="flex min-h-10 items-center rounded-lg px-3 py-2 text-label-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            {t("allLocations")}
          </Link>
        </div>
      </div>
    </>
  );
}

interface Props {
  me: { name: string; email: string; id: string; avatarUrl: string | null };
  memberships: Membership[];
  current: Membership;
}

function NavContent({ me, memberships, current }: Props) {
  const t = useTranslations("dashboard");
  const { role, location } = current;
  const base = `/locations/${location.id}`;
  const link = ({ slug, key, icon }: (typeof SECTIONS)[number]) => (
    <NavLink key={key} href={slug ? `${base}/${slug}` : base} icon={icon} label={t(`sections.${key}`)} />
  );
  return (
    <div className="flex h-full flex-col gap-4">
      <LocationSwitcher memberships={memberships} current={current} />
      <nav aria-label={t("navigation")} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {SECTIONS.filter((section) => !section.managers).map(link)}
        {isManager(role) && (
          <>
            <p className="mt-4 px-3 pb-1 text-label-xs text-muted">{t("manage")}</p>
            {SECTIONS.filter((section) => section.managers).map(link)}
            {role === "OWNER" && (
              <NavLink href={`/businesses/${location.business.id}`} icon="home" label={t("businessSettings")} />
            )}
          </>
        )}
      </nav>
      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Avatar id={me.id} name={me.name} src={me.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-sm">{me.name}</p>
          <p className="truncate text-p-xs text-muted" title={me.email}>
            {me.email}
          </p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

// ADR 0049: a floating panel beside the page, a drawer under 1024px, with a bar
// over the page saying which Location this is.
export function LocationNav(props: Props) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  const { name, business } = props.current.location;

  return (
    <>
      <div className="flex items-center gap-3 px-4 pt-4 lg:hidden">
        <Button variant="secondary" size="icon" aria-label={t("openNavigation")} onClick={() => setOpen(true)}>
          <Icon name="more-hor" className="size-4" />
        </Button>
        <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" />
        <p className="line-clamp-2 min-w-0 text-label-sm wrap-anywhere">{name}</p>
      </div>
      {open && (
        <Dialog open variant="drawer" title={t("navigation")} onClose={() => setOpen(false)}>
          <div
            className="h-full"
            onClick={(event) => {
              // Staying open over the page a link just opened would hide it.
              if ((event.target as Element).closest("a")) setOpen(false);
            }}
          >
            <NavContent {...props} />
          </div>
        </Dialog>
      )}
      <aside className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-80 shrink-0 lg:block">
        <Panel className="h-full">
          <NavContent {...props} />
        </Panel>
      </aside>
    </>
  );
}
