import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "./page-skeleton";

const BARS = ["h-1/3", "h-1/2", "h-2/3", "h-2/5", "h-3/4", "h-1/2", "h-1/4"];
const ROWS = 5;

// Today's own shape: four stats, the chart, Coming up and Needs you, then the
// table of open Tickets.
export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
        {[0, 1, 2, 3].map((stat) => (
          <Panel key={stat} className="flex flex-col gap-3 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-24 max-w-full" />
              <Skeleton className="size-9 shrink-0 rounded-full!" />
            </div>
            <Skeleton className="h-12 w-16 lg:h-14" />
            <Skeleton className="h-4 w-32 max-w-full" />
          </Panel>
        ))}
        <Panel className="col-span-2 flex h-80 flex-col gap-4 max-md:order-1">
          <Skeleton className="h-6 w-40" />
          <div className="flex min-h-0 flex-1 items-end gap-3">
            {BARS.map((height, bar) => (
              <Skeleton key={bar} className={`flex-1 ${height}`} />
            ))}
          </div>
        </Panel>
        {[0, 1].map((tile) => (
          <Panel key={tile} className="col-span-2 flex h-80 flex-col gap-4 max-md:order-1 md:col-span-1">
            <Skeleton className="h-6 w-28" />
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-10 rounded-xl!" />
            ))}
          </Panel>
        ))}
      </div>
      <Panel padding="none" className="flex flex-1 flex-col overflow-clip">
        <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="hidden h-11 w-96 max-w-full rounded-full! md:block" />
        </div>
        {Array.from({ length: ROWS }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-t border-border px-5 py-4 lg:px-7">
            <Skeleton className="size-10 shrink-0 rounded-full!" />
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="ml-auto hidden h-8 w-28 rounded-full! md:block" />
            <Skeleton className="hidden h-10 w-32 rounded-full! lg:block" />
          </div>
        ))}
      </Panel>
    </PageSkeleton>
  );
}
