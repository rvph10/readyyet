import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/breadcrumbs";

export function AdminHeader({
  title,
  subtitle,
  crumbs,
  children,
}: {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1">
      {crumbs && <Breadcrumbs crumbs={crumbs} />}
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 title={title} className="text-title-h5 wrap-anywhere md:text-title-h4">
            {title}
          </h1>
          {subtitle && <p className="text-p-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}
