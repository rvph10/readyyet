import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

// ADR 0059: a small neutral label, like an invitation's "Pending". Tinted
// with ink so it shows on a panel and on the canvas, and never coloured, so
// it can't be taken for a Status.
export function Badge({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-ink/6 px-2.5 text-label-xs whitespace-nowrap text-muted">
      {icon && <Icon name={icon} className="size-3" />}
      {children}
    </span>
  );
}
