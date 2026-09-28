import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "./button";
import { Icon } from "./icon";

type Tone = "info" | "error";

const tones: Record<Tone, string> = {
  info: "bg-surface text-ink shadow-panel",
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
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-4 py-3 text-p-sm ${tones[tone]}`}
    >
      <Icon name={tone === "error" ? "info-triangle" : "info"} className="size-3.5 shrink-0" />
      <p className="min-w-0 flex-1">{children}</p>
      {action && (
        <Link
          href={action.href}
          className={buttonClass({ variant: tone === "error" ? "danger" : "primary", size: "sm" })}
        >
          {action.label}
          <Icon name="arrow-right" className="size-2.5" />
        </Link>
      )}
    </div>
  );
}
