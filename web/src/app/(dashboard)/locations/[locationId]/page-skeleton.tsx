import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// ADR 0094: each page's loading.tsx draws that page's own tiles, so nothing
// moves when the data arrives. This is the part they share: PageHeader's shape.
export function PageSkeleton({
  children,
  back,
  subtitle,
}: {
  children: ReactNode;
  back?: boolean;
  subtitle?: boolean;
}) {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy className="flex flex-1 flex-col gap-4 lg:gap-5">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          {back && <Skeleton className="size-11 shrink-0 rounded-full! md:size-12" />}
          <div className="min-w-0 flex-1">
            <Skeleton className="h-9 w-72 max-w-full md:h-10" />
            {subtitle && <Skeleton className="mt-1 h-4 w-96 max-w-full" />}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
