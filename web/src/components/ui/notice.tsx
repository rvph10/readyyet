import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

type Tone = "success" | "brand" | "warning";

const tones: Record<Tone, string> = {
  success: "bg-pine-subtle text-pine",
  brand: "bg-brand text-ink",
  warning: "bg-warning-subtle text-ink",
};

interface Props {
  tone: Tone;
  icon?: IconName;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

// Something said inside a card or a form, with what can be done about it. The
// actions follow the words: under them in a narrow card, beside them in a wide
// one, never wrapped under the icon.
export function Notice({ tone, icon, children, actions, className = "" }: Props) {
  return (
    <div className={`@container rounded-2xl ${tones[tone]} ${className}`}>
      <div
        className={`grid items-center gap-x-3 gap-y-3 p-4 ${icon ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1"} ${actions ? (icon ? "@lg:grid-cols-[auto_minmax(0,1fr)_auto]" : "@lg:grid-cols-[minmax(0,1fr)_auto]") : ""}`}
      >
        {icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
            <Icon name={icon} className="size-3" />
          </span>
        )}
        <div className="min-w-0 text-label-sm text-pretty">{children}</div>
        {actions && (
          <div className={`flex flex-wrap gap-2 ${icon ? "col-start-2 @lg:col-start-3" : ""}`}>{actions}</div>
        )}
      </div>
    </div>
  );
}
