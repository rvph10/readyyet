"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import type { SettingsSection } from "./settings-views";

const ICONS: Record<SettingsSection, IconName> = {
  shop: "home",
  hours: "time",
  tickets: "tag",
  reviews: "comment",
  delete: "info-triangle",
};

interface Props {
  start: SettingsSection;
  sections: Partial<Record<SettingsSection, ReactNode>>;
  // Said in the menu while Customers aren't being asked.
  reviewsOff: boolean;
}

// ADR 0100: one sheet with its own menu, unlike the bento of working pages. Every
// section stays mounted, so unsaved changes survive a look at another one, and
// switching is instant. The section is still in the URL, for a link to lead there.
export function SettingsShell({ start, sections, reviewsOff }: Props) {
  const t = useTranslations("settings");
  const [active, setActive] = useState(start);
  const names = Object.keys(sections) as SettingsSection[];

  return (
    <Panel padding="none" className="flex min-h-0 flex-1 flex-col overflow-clip lg:flex-row">
      <nav
        aria-label={t("navLabel")}
        className="shrink-0 border-b border-border p-3 lg:w-64 lg:border-r lg:border-b-0 lg:p-4"
      >
        <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible">
          {names.map((name) => (
            <li key={name} className="shrink-0">
              <Link
                href={`?section=${name}`}
                aria-current={name === active ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setActive(name);
                  window.history.replaceState(null, "", `?section=${name}`);
                }}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-label-sm whitespace-nowrap transition-colors ${
                  name === "delete"
                    ? `text-danger hover:bg-danger-subtle lg:mt-4 ${name === active ? "bg-danger-subtle" : ""}`
                    : name === active
                      ? "bg-subtle text-ink"
                      : "text-muted hover:bg-subtle hover:text-ink"
                }`}
              >
                <Icon name={ICONS[name]} className="size-3.5 shrink-0" />
                <span className="flex-1">{t(`nav.${name}`)}</span>
                {name === "reviews" && reviewsOff && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-label-xs text-ink">{t("off")}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Relative, so what's absolutely placed in a form scrolls with it, rather
          than stretching the page. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col px-5 pt-6 lg:overflow-y-auto lg:px-10 lg:pt-8">
        {names.map((name) => (
          <div key={name} className={name === active ? "flex flex-1 flex-col" : "hidden"}>
            {sections[name]}
          </div>
        ))}
      </div>
    </Panel>
  );
}
