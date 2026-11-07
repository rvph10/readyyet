import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../page-skeleton";

const ROWS = 4;

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-5">
        <Panel padding="none" className="lg:row-span-2">
          <Skeleton className="mx-5 mt-5 mb-3 h-7 w-32 lg:mx-7 lg:mt-6" />
          {Array.from({ length: ROWS }, (_, row) => (
            <div
              key={row}
              className="flex items-center gap-4 border-t border-border px-5 py-4 first:border-t-0 lg:px-7"
            >
              <Skeleton className="size-10 shrink-0 rounded-full! lg:size-12" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-44 max-w-full" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
              <Skeleton className="hidden h-10 w-24 rounded-full! sm:block" />
            </div>
          ))}
        </Panel>
        <Skeleton className="h-52 rounded-sheet! max-lg:order-first lg:h-60" />
        <Panel className="flex flex-col gap-3">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Panel>
      </div>
    </PageSkeleton>
  );
}
