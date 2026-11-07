import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// ADR 0094: each page's loading.tsx draws that page's own tiles, so nothing
// moves when the data arrives. This is the part they share: PageHeader's shape.
export function PageSkeleton({
  children,
  subtitle,
  home,
}: {
  children: ReactNode;
  subtitle?: boolean;
  // Today has no breadcrumbs.
  home?: boolean;
}) {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy className="flex min-h-0 flex-1 flex-col gap-4 lg:gap-5">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <div className="flex min-w-0 flex-col gap-1">
        {!home && <Skeleton className="h-8 w-40 max-w-full" />}
        <Skeleton className="h-9 w-72 max-w-full md:h-10" />
        {subtitle && <Skeleton className="mt-1 h-4 w-96 max-w-full" />}
      </div>
      {children}
    </div>
  );
}
