import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../page-skeleton";

const ROWS = 5;

export default function Loading() {
  return (
    <PageSkeleton subtitle>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] lg:gap-5">
        <Panel padding="none" className="flex flex-col p-5 lg:p-7">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 shrink-0 rounded-full!" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-7 w-56 max-w-full" />
              <Skeleton className="h-4 w-36 max-w-full" />
            </div>
          </div>
          <Skeleton className="mt-6 h-4 w-36 max-w-full" />
          <Skeleton className="mt-2 h-32 rounded-2xl!" />
          <Skeleton className="mt-5 h-16 rounded-2xl!" />
          <Skeleton className="mt-5 h-14 w-full max-w-xl rounded-2xl!" />
        </Panel>
        <Panel className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-7 w-48 max-w-full" />
            <Skeleton className="h-4 w-44 max-w-full" />
          </div>
          <Skeleton className="mt-3 mb-3 h-11 w-60 max-w-full rounded-full!" />
          {Array.from({ length: ROWS }, (_, row) => (
            <div key={row} className="flex items-center gap-3 rounded-2xl p-3">
              <Skeleton className="size-10 shrink-0 rounded-full!" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-3.5 w-48 max-w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </PageSkeleton>
  );
}
