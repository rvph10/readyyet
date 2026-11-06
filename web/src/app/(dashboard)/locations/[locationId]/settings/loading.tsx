import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../page-skeleton";

const SECTIONS = 4;
const ROWS = 5;

export default function Loading() {
  return (
    <PageSkeleton>
      <Panel padding="none" className="flex flex-1 flex-col lg:flex-row">
        <div className="flex shrink-0 gap-1 border-b border-border p-3 lg:w-64 lg:flex-col lg:border-r lg:border-b-0 lg:p-4">
          {Array.from({ length: SECTIONS }, (_, section) => (
            <Skeleton key={section} className="h-11 w-28 rounded-xl! lg:w-full" />
          ))}
        </div>
        <div className="min-w-0 flex-1 px-5 pt-6 lg:px-10 lg:pt-8">
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="mt-2 mb-6 h-5 w-96 max-w-full" />
          {Array.from({ length: ROWS }, (_, row) => (
            <div key={row} className="grid gap-3 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
              <Skeleton className="h-5 w-32 max-w-full" />
              <Skeleton className="h-12 w-full rounded-xl!" />
            </div>
          ))}
        </div>
      </Panel>
    </PageSkeleton>
  );
}
