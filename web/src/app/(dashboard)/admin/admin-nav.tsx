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
import { Icon } from "@/components/ui/icon";

function Title() {
  const t = useTranslations("admin");
  return (
    <span className="flex h-11 min-w-0 items-center gap-2.5 px-1 text-label-md">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-pine text-brand">
        <Icon name="layers" className="size-3.5" />
      </span>
      <span className="truncate">{t("title")}</span>
    </span>
  );
}

export function AdminNav({
  me,
  collapsed: initial,
  children,
}: {
  me: SidebarUser;
  collapsed: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("admin");
  const tDashboard = useTranslations("dashboard");
  const [collapsed, toggle] = useCollapsed(initial);
  const pathname = usePathname();
  return (
    <>
      <BarFrame nav={<Title />}>
        <Link href="/" className={buttonClass({ variant: "secondary", size: "sm" })}>
          <Icon name="arrow-left-1" className="size-2.5" />
          {t("backToShops")}
        </Link>
      </BarFrame>
      <div className="flex min-w-0 flex-1">
        <SidebarFrame collapsed={collapsed} onToggle={toggle}>
          <nav aria-label={tDashboard("navigation")} className="flex flex-1 flex-col gap-0.5 roomy:gap-1">
            <NavItem href="/admin" icon="user" label={t("nav.salesPartners")} current={pathname.startsWith("/admin")} />
          </nav>
          <UserRow me={me} detail={t("platformAdmin")} />
        </SidebarFrame>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 px-4 pt-3 md:hidden">
            <Title />
            <Popover
              label={me.name}
              popoverClass="menu-popover w-80 max-w-[calc(100vw-2rem)]"
              triggerClass="cursor-pointer rounded-full"
              trigger={<Avatar id={me.id} name={me.name} src={me.avatarUrl} />}
            >
              <UserPanel me={me} detail={t("platformAdmin")} />
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
