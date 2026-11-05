import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { TrackingColumn, TrackingColumns, TrackingGrid } from "./tracking-grid";

// The page's shape in its most common state, an open Ticket with an estimated
// date, so its panels stay where they are when the data arrives.
export function TrackingSkeleton() {
  const t = useTranslations("tracking");
  return (
    <TrackingGrid busy>
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <header className="flex items-center gap-3 px-1">
        <Skeleton className="size-14 shrink-0 rounded-2xl!" />
        <Skeleton className="h-5 w-44" />
      </header>
      <TrackingColumns>
        <TrackingColumn>
          <div className="rounded-3xl bg-surface p-6 shadow-panel md:p-8">
            <Skeleton className="h-10 w-64 max-w-full md:h-12" />
            <Skeleton className="mt-3 h-5 w-80 max-w-full" />
            <Skeleton className="mt-5 h-4 w-52 max-w-full" />
            <Skeleton className="mt-5 h-10 w-56 max-w-full rounded-xl!" />
          </div>
          <Panel padding="lg" className="lg:flex-1">
            <Skeleton className="mb-5 h-6 w-28" />
            <div className="flex flex-col gap-6">
              {["w-24", "w-32", "w-28", "w-20"].map((width) => (
                <div key={width} className="flex items-center gap-3">
                  <Skeleton className="size-6 shrink-0 rounded-full!" />
                  <Skeleton className={`h-4 ${width}`} />
                </div>
              ))}
            </div>
          </Panel>
        </TrackingColumn>
        <TrackingColumn>
          <Panel padding="lg" className="lg:flex-1">
            <Skeleton className="mb-4 h-6 w-24" />
            <div className="flex flex-col gap-3">
              {["w-40", "w-44", "w-32", "w-36"].map((width) => (
                <div key={width} className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-xl!" />
                  <Skeleton className={`h-4 max-w-full ${width}`} />
                </div>
              ))}
            </div>
          </Panel>
        </TrackingColumn>
      </TrackingColumns>
    </TrackingGrid>
  );
}
