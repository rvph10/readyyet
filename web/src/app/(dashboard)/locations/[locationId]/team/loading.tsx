import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../page-skeleton";

const MEMBERS = 4;
const INVITATIONS = 2;

// The members beside the invitations, which come first on a phone.
export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)] lg:gap-5">
        <Panel padding="none">
          <Skeleton className="mx-5 mt-5 mb-3 h-7 w-32 lg:mx-7 lg:mt-6" />
          <div>
            {Array.from({ length: MEMBERS }, (_, row) => (
              <div
                key={row}
                className="flex items-center gap-3 border-t border-border px-5 py-4 first:border-t-0 lg:min-h-20 lg:gap-4 lg:px-7 lg:py-3"
              >
                <Skeleton className="size-10 shrink-0 rounded-full! lg:size-12" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-5 w-44 max-w-full" />
                  <Skeleton className="h-3.5 w-56 max-w-full" />
                </div>
                <Skeleton className="hidden h-5 w-28 shrink-0 sm:block" />
                <Skeleton className="hidden h-4 w-32 shrink-0 xl:block" />
                <Skeleton className="h-11 w-24 shrink-0 rounded-full! lg:h-10" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="flex flex-col max-lg:order-first">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-11 w-24 shrink-0 rounded-full! lg:h-10" />
          </div>
          <div className="mt-3">
            {Array.from({ length: INVITATIONS }, (_, row) => (
              <div key={row} className="flex flex-col gap-1.5 border-t border-border py-3 first:border-t-0 first:pt-0">
                <Skeleton className="h-5 w-48 max-w-full" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageSkeleton>
  );
}
