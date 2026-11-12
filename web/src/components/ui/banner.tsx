import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "./button";
import { Icon } from "./icon";

type Tone = "info" | "error";

const tones: Record<Tone, string> = {
  info: "border border-border bg-surface text-ink",
  error: "bg-danger-subtle text-danger",
};

interface Props {
  tone?: Tone;
  children: ReactNode;
  // Where it gets fixed, like the billing page.
  action?: { href: string; label: string };
}

// ADR 0059: a notice about the whole Business or Location, above a page's
// content, like a trial ending or a payment that failed. It stays until what
// it's about is fixed, so it has no close button. Neutral or red, like
// FormAlert, whose place is inside a form instead.
export function Banner({ tone = "info", children, action }: Props) {
  // Its action under the words while narrow, beside them once wide, never
  // wrapped under the icon (as Notice).
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`@container rounded-2xl text-p-sm ${tones[tone]}`}>
      <div
        className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 ${action ? "@lg:grid-cols-[auto_minmax(0,1fr)_auto]" : ""}`}
      >
        <Icon name={tone === "error" ? "info-triangle" : "info"} className="size-3.5 shrink-0" />
        <p className="min-w-0">{children}</p>
        {action && (
          <Link
            href={action.href}
            className={`col-start-2 justify-self-start @lg:col-start-3 ${buttonClass({ variant: tone === "error" ? "danger" : "primary", size: "sm" })}`}
          >
            {action.label}
            <Icon name="arrow-right" className="size-2.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
