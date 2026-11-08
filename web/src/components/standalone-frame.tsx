"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  NavItem,
  Popover,
  SidebarFrame,
  useCollapsed,
  UserPanel,
  UserRow,
  type SidebarUser,
} from "@/components/sidebar";
import { BarFrame } from "@/components/top-bar";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";

interface Props {
  me: SidebarUser;
  collapsed: boolean;
  title: string;
  icon: IconName;
  // The line under the User's name, where a shop would show their Role.
  detail: string;
  nav: { href: string; icon: IconName; label: string }[];
  // Top right, the way to the shops or to opening one.
  exit: { href: string; label: string; icon: IconName };
  children: ReactNode;
}

function Title({ title, icon }: { title: string; icon: IconName }) {
  return (
    <span className="flex h-11 min-w-0 items-center gap-2.5 px-1 text-label-md">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-pine text-brand">
        <Icon name={icon} className="size-3.5" />
      </span>
      <span className="truncate">{title}</span>
    </span>
  );
}

// ADR 0120: the frame of pages above any Business, the back office (ADR 0119)
// and a sales partner's page, with the dashboard's bar, sidebar and User menu.
export function StandaloneFrame({ me, collapsed: initial, title, icon, detail, nav, exit, children }: Props) {
  const t = useTranslations("dashboard");
  const [collapsed, toggle] = useCollapsed(initial);
  const pathname = usePathname();
  const exitLink = (
    <Link href={exit.href} className={buttonClass({ variant: "secondary", size: "sm" })}>
      <Icon name={exit.icon} className="size-2.5" />
      {exit.label}
    </Link>
  );
  return (
    <>
      <BarFrame nav={<Title title={title} icon={icon} />}>{exitLink}</BarFrame>
      <div className="flex min-w-0 flex-1">
        <SidebarFrame collapsed={collapsed} onToggle={toggle}>
          <nav aria-label={t("navigation")} className="flex flex-1 flex-col gap-0.5 roomy:gap-1">
            {nav.map((item) => (
              <NavItem key={item.href} {...item} current={pathname.startsWith(item.href)} />
            ))}
          </nav>
          <UserRow me={me} detail={detail} />
        </SidebarFrame>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 px-4 pt-3 md:hidden">
            <Title title={title} icon={icon} />
            <Popover
              label={me.name}
              popoverClass="menu-popover w-80 max-w-[calc(100vw-2rem)]"
              triggerClass="cursor-pointer rounded-full"
              trigger={<Avatar id={me.id} name={me.name} src={me.avatarUrl} />}
            >
              <div className="p-1">
                <Link
                  href={exit.href}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-label-sm transition-colors hover:bg-subtle"
                >
                  <Icon name={exit.icon} className="size-3 text-muted" />
                  {exit.label}
                </Link>
              </div>
              <div className="mx-3 border-t border-border" />
              <UserPanel me={me} detail={detail} />
            </Popover>
          </div>
          <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-3 md:px-5 md:py-4 lg:gap-5 lg:px-7 lg:py-5">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
