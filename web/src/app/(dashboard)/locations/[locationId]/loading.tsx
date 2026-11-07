import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "./page-skeleton";

const BARS = ["h-1/3", "h-1/2", "h-2/3", "h-2/5", "h-3/4", "h-1/2", "h-1/4"];
const ROWS = 5;

// Today's own shape: the stats over the table of open Tickets, beside Needs you,
// Coming up and the chart.
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col xl:h-[calc(100dvh-6.5rem)] xl:min-h-[49rem] xl:flex-none">
      <PageSkeleton home subtitle>
        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="contents xl:flex xl:min-h-0 xl:min-w-0 xl:flex-col xl:gap-5">
            <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-5">
              {[0, 1, 2, 3].map((stat) => (
                <Panel key={stat} className="flex flex-col gap-2 p-4!">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-24 max-w-full" />
                    <Skeleton className="size-8 shrink-0 rounded-full!" />
                  </div>
                  <Skeleton className="h-12 w-16" />
                  <Skeleton className="h-4 w-32 max-w-full" />
                </Panel>
              ))}
            </div>
            <Panel
              padding="none"
              className="flex flex-col overflow-clip max-xl:order-4 md:col-span-2 xl:min-h-0 xl:flex-1"
            >
              <div className="flex flex-col gap-3 px-5 pt-5 pb-3 lg:px-7">
                <Skeleton className="h-10 w-44" />
                <Skeleton className="hidden h-11 w-96 max-w-full rounded-full! md:block" />
              </div>
              {Array.from({ length: ROWS }, (_, row) => (
                <div key={row} className="flex items-center gap-4 border-t border-border px-5 py-4 lg:px-7">
                  <Skeleton className="size-10 shrink-0 rounded-full!" />
                  <Skeleton className="h-5 w-40 max-w-full" />
                  <Skeleton className="ml-auto hidden h-8 w-28 rounded-full! md:block" />
                </div>
              ))}
            </Panel>
          </div>
          <div className="contents xl:flex xl:min-h-0 xl:min-w-0 xl:flex-col xl:gap-5">
            {[0, 1].map((tile) => (
              <Panel key={tile} className={`flex flex-col gap-3 max-xl:order-1 ${tile === 0 ? "xl:flex-1" : ""}`}>
                <Skeleton className="h-6 w-28" />
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-9 rounded-xl!" />
                ))}
              </Panel>
            ))}
            <Panel className="flex h-56 flex-col gap-3 max-xl:order-3 md:col-span-2">
              <Skeleton className="h-6 w-40" />
              <div className="flex min-h-0 flex-1 items-end gap-3">
                {BARS.map((height, bar) => (
                  <Skeleton key={bar} className={`flex-1 ${height}`} />
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </PageSkeleton>
    </div>
  );
}
