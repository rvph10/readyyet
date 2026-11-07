import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../page-skeleton";

const STOPS = 6;
const CHOICES = 7;

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)] lg:gap-5">
        <Panel padding="none" className="flex flex-col gap-4 p-5 lg:p-7">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mb-3 h-4 w-96 max-w-full" />
          {Array.from({ length: STOPS }, (_, stop) => (
            <div key={stop} className="flex items-center gap-4">
              <Skeleton className="size-10 shrink-0 rounded-full!" />
              <Skeleton className="h-5 w-48 max-w-full" />
            </div>
          ))}
        </Panel>
        <Panel className="flex flex-col gap-3">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-11 w-full rounded-full!" />
          {Array.from({ length: CHOICES }, (_, choice) => (
            <Skeleton key={choice} className="h-9 w-full rounded-xl!" />
          ))}
        </Panel>
      </div>
    </PageSkeleton>
  );
}
