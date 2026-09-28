import Link from "next/link";
import { Count } from "./count";

interface Tab {
  href: string;
  label: string;
  count?: number;
  current?: boolean;
}

// ADR 0049: a pill track with a white pill under the current tab. Each tab
// is a link, so the chosen view is in the URL and survives a reload. The
// track is a tint of ink, not canvas, so it shows on a panel and on the page
// alike, and scrolls sideways when the tabs outgrow a phone (ADR 0057).
export function Tabs({ label, tabs }: { label: string; tabs: Tab[] }) {
  return (
    <nav aria-label={label} className="max-w-full overflow-x-auto">
      <ul className="inline-flex gap-1 rounded-full bg-ink/6 p-1">
        {tabs.map((tab) => (
          <li key={tab.href} className="shrink-0">
            <Link
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              className={`flex h-9 items-center gap-2 rounded-full px-4 text-label-sm whitespace-nowrap transition-colors ${
                tab.current ? "bg-surface text-ink shadow-float" : "text-muted hover:bg-surface/60 hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <Count value={tab.count} />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
