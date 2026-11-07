import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "./page-skeleton";

const BARS = ["h-1/3", "h-1/2", "h-2/3", "h-2/5", "h-3/4", "h-1/2", "h-1/4"];
const ROWS = 5;

// Today's own shape: the stats and the week's chart over the table.
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col xl:h-[calc(100dvh-6.5rem)] xl:min-h-[40rem] xl:flex-none">
      <PageSkeleton home subtitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-5 xl:grid-cols-[1.3fr_1fr_1fr_1fr_1.7fr]">
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
          <Panel className="col-span-2 flex h-32 items-end gap-3 p-4! md:col-span-4 xl:col-span-1 xl:h-auto">
            {BARS.map((height, bar) => (
              <Skeleton key={bar} className={`flex-1 ${height}`} />
            ))}
          </Panel>
        </div>
        <Panel padding="none" className="flex flex-col overflow-clip xl:min-h-0 xl:flex-1">
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
      </PageSkeleton>
    </div>
  );
}
