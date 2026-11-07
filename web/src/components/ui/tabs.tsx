import Link from "next/link";
import { Count } from "./count";

interface Tab {
  href: string;
  label: string;
  count?: number;
  current?: boolean;
}

// ADR 0087: filter pills, pine under the current one. Each is a link, so the
// chosen view is in the URL and survives a reload, and they scroll sideways
// when they outgrow a phone.
export function Tabs({ label, tabs, scroll }: { label: string; tabs: Tab[]; scroll?: boolean }) {
  return (
    <nav aria-label={label} className="max-w-full overflow-x-auto [scrollbar-width:none]">
      <ul className="inline-flex gap-1">
        {tabs.map((tab) => (
          <li key={tab.href} className="shrink-0">
            <Link
              href={tab.href}
              scroll={scroll}
              aria-current={tab.current ? "page" : undefined}
              className={`flex h-11 items-center gap-2 rounded-full px-4 text-label-sm whitespace-nowrap transition-colors lg:h-10 ${
                tab.current ? "bg-pine text-surface" : "text-muted hover:bg-subtle hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <Count value={tab.count} current={tab.current} />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
