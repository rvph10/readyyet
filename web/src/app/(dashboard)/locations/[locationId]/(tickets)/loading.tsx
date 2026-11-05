import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 8;

export default function Loading() {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy className="flex flex-col gap-5">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-11 w-72 rounded-full" />
        <Skeleton className="h-11 min-w-64 flex-1 rounded-full xl:max-w-96" />
      </div>
      <Panel padding="none" className="divide-y divide-border">
        {Array.from({ length: ROWS }, (_, row) => (
          <div key={row} className="flex items-center justify-between gap-6 p-4 md:px-5">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-full max-w-64" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
            <Skeleton className="hidden h-4 w-32 md:block" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </Panel>
    </div>
  );
}
