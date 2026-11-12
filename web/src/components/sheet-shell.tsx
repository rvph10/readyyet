"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
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

const WIDE = "(min-width: 64rem)";

// ADR 0100: one sheet with its own menu, unlike the bento of working pages. Every
// section stays mounted, so unsaved changes survive a look at another one, and
// switching is instant. The section is still in the URL, for a link to lead there.
// Settings and the profile share it (ADR 0118). On a phone it's a list of the
// sections first, each opening on its own with a way back, like a phone's own
// settings: a row of tabs scrolling sideways hid most of them.
export function SheetShell({
  label,
  back,
  start,
  sections,
}: {
  label: string;
  // The page's name, on the way back to the list on a phone.
  back: string;
  start: string;
  sections: SheetSection[];
}) {
  // Read from the URL, which Next.js keeps in step with pushState and
  // replaceState, so a link inside a section (the delete dialog's "export
  // first") switches too.
  const requested = useSearchParams().get("section");
  const chosen = sections.some(({ name }) => name === requested) ? requested : null;
  const active = chosen ?? start;

  return (
    <Panel padding="none" className="flex min-h-0 flex-1 flex-col overflow-clip lg:flex-row">
      <nav
        aria-label={label}
        className={`shrink-0 p-3 lg:block lg:w-64 lg:border-r lg:border-border lg:p-4 ${chosen ? "hidden" : ""}`}
      >
        <ul className="flex flex-col gap-1">
          {sections.map(({ name, icon, label: text, badge, danger }) => (
            <li key={name} className="shrink-0">
              <Link
                href={`?section=${name}`}
                aria-current={name === active ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  // On a phone, the back gesture returns to the list.
                  const wide = window.matchMedia(WIDE).matches;
                  window.history[wide ? "replaceState" : "pushState"](null, "", `?section=${name}`);
                }}
                className={`flex h-14 items-center gap-3 rounded-xl px-3 text-label-md whitespace-nowrap transition-colors lg:h-11 lg:text-label-sm ${
                  danger
                    ? `text-danger hover:bg-danger-subtle lg:mt-4 ${name === active ? "bg-danger-subtle" : ""}`
                    : name === active
                      ? "text-ink hover:bg-subtle lg:bg-subtle"
                      : "text-ink hover:bg-subtle lg:text-muted lg:hover:text-ink"
                }`}
              >
                <Icon name={icon} className="size-3.5 shrink-0" />
                <span className="flex-1">{text}</span>
                {badge}
                <Icon name="arrow-right" className="size-2.5 shrink-0 text-muted lg:hidden" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Relative, so what's absolutely placed in a form scrolls with it, rather
          than stretching the page. */}
      <div
        className={`relative min-h-0 min-w-0 flex-1 flex-col px-5 pt-4 lg:flex lg:overflow-y-auto lg:px-10 lg:pt-8 ${chosen ? "flex" : "hidden"}`}
      >
        <Link
          href="?"
          onClick={(event) => {
            event.preventDefault();
            window.history.replaceState(null, "", window.location.pathname);
          }}
          className="-ml-2 mb-3 flex h-11 items-center gap-2 self-start rounded-full px-2 text-label-sm lg:hidden"
        >
          <Icon name="arrow-right" className="size-2.5 rotate-180" />
          {back}
        </Link>
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
