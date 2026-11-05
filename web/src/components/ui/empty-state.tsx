import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

// Where a list has nothing yet: what would be here, and the action that
// fills it.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-canvas text-muted">
        <Icon name={icon} className="size-5" />
      </span>
      <p className="max-w-full text-label-md wrap-anywhere">{title}</p>
      <p className="mt-1 max-w-xs text-p-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
