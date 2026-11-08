"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";

export interface SheetSection {
  name: string;
  icon: IconName;
  label: string;
  // Said beside the label, like "Off" for Google reviews: a MenuBadge, or a
  // Suspense around one while what it says loads.
  badge?: ReactNode;
  // The last, red, apart from the rest.
  danger?: boolean;
  content: ReactNode;
}

// ADR 0100: one sheet with its own menu, unlike the bento of working pages. Every
// section stays mounted, so unsaved changes survive a look at another one, and
// switching is instant. The section is still in the URL, for a link to lead there.
// Settings and the profile share it (ADR 0118).
export function SheetShell({ label, start, sections }: { label: string; start: string; sections: SheetSection[] }) {
  const [active, setActive] = useState(start);

  return (
    <Panel padding="none" className="flex min-h-0 flex-1 flex-col overflow-clip lg:flex-row">
      <nav aria-label={label} className="shrink-0 border-b border-border p-3 lg:w-64 lg:border-r lg:border-b-0 lg:p-4">
        <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible">
          {sections.map(({ name, icon, label: text, badge, danger }) => (
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
                  danger
                    ? `text-danger hover:bg-danger-subtle lg:mt-4 ${name === active ? "bg-danger-subtle" : ""}`
                    : name === active
                      ? "bg-subtle text-ink"
                      : "text-muted hover:bg-subtle hover:text-ink"
                }`}
              >
                <Icon name={icon} className="size-3.5 shrink-0" />
                <span className="flex-1">{text}</span>
                {badge}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Relative, so what's absolutely placed in a form scrolls with it, rather
          than stretching the page. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col px-5 pt-6 lg:overflow-y-auto lg:px-10 lg:pt-8">
        {sections.map(({ name, content }) => (
          <div key={name} className={name === active ? "flex flex-1 flex-col" : "hidden"}>
            {content}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function MenuBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-brand px-2 py-0.5 text-label-xs text-ink">{children}</span>;
}
