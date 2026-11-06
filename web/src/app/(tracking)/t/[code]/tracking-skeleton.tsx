import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { TrackingBento, TrackingGrid } from "./tracking-grid";

// The page's shape in its most common state, an open Ticket with an estimated
// date and no photos, so its tiles stay where they are when the data arrives.
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
      <TrackingBento photos={false}>
        <div className="flex flex-col gap-6 rounded-sheet border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between md:p-8 lg:col-span-2">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-10 w-64 max-w-full md:h-12" />
            <Skeleton className="mt-3 h-5 w-80 max-w-full" />
            <Skeleton className="mt-5 h-4 w-52 max-w-full" />
            <Skeleton className="mt-5 h-10 w-56 max-w-full rounded-xl!" />
          </div>
          <Skeleton className="size-40 shrink-0 self-center rounded-full! sm:size-52 lg:size-64" />
        </div>
        <Panel padding="lg" className="order-5 flex flex-col gap-3 lg:order-none lg:row-span-2">
          <Skeleton className="mb-1 h-7 w-28" />
          {["w-40", "w-44", "w-32", "w-36"].map((width) => (
            <div key={width} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-xl!" />
              <Skeleton className={`h-4 max-w-full ${width}`} />
            </div>
          ))}
        </Panel>
        <Panel padding="lg" className="flex flex-col lg:col-span-2">
          <Skeleton className="mb-6 h-7 w-32" />
          <div className="my-auto flex flex-col gap-6 md:flex-row md:justify-around">
            {[0, 1, 2].map((step) => (
              <div key={step} className="flex items-center gap-3 md:flex-col">
                <Skeleton className="size-10 shrink-0 rounded-full!" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </Panel>
      </TrackingBento>
    </TrackingGrid>
  );
}
