import type { ReactNode } from "react";
import { BusinessCrumbs } from "./business-crumbs";

// Every Business page opens with this, its one action on the right.
export function BusinessHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1">
      <BusinessCrumbs title={title} />
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-title-h5 wrap-anywhere md:text-title-h4">{title}</h1>
          {subtitle && <p className="text-p-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}
