import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../../page-skeleton";

const ROWS = 6;

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid flex-1 grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-3 xl:grid-rows-[auto_minmax(0,1fr)]">
        <Panel padding="lg" className="col-span-2 flex flex-col gap-3 xl:col-span-1 xl:row-span-2">
          <Skeleton className="size-20 rounded-full!" />
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-40 max-w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </Panel>
        <Skeleton className="h-36 rounded-sheet! lg:h-44" />
        <Skeleton className="h-36 rounded-sheet! lg:h-44" />
        <Panel className="col-span-2 flex flex-col gap-1">
          <Skeleton className="mb-3 h-7 w-32" />
          {Array.from({ length: ROWS }, (_, row) => (
            <div key={row} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-64 max-w-full" />
                <Skeleton className="h-3.5 w-40 max-w-full" />
              </div>
              <Skeleton className="h-8 w-28 rounded-full!" />
            </div>
          ))}
        </Panel>
      </div>
    </PageSkeleton>
  );
}
