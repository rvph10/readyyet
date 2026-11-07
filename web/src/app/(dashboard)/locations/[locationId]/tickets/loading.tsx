import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../page-skeleton";

const ROWS = 9;

export default function Loading() {
  return (
    <PageSkeleton>
      <Panel padding="none" className="flex flex-1 flex-col overflow-clip">
        <div className="px-5 pt-5 pb-4 lg:px-7 lg:pt-6">
          <Skeleton className="h-11 w-[28rem] max-w-full rounded-full!" />
        </div>
        {Array.from({ length: ROWS }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-t border-border px-5 py-4 lg:px-7">
            <Skeleton className="size-10 shrink-0 rounded-full!" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-44 max-w-full" />
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
            <Skeleton className="hidden h-8 w-28 rounded-full! md:block" />
            <Skeleton className="hidden h-4 w-24 lg:block" />
          </div>
        ))}
      </Panel>
    </PageSkeleton>
  );
}
