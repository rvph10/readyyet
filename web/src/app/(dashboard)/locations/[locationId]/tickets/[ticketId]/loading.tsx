import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../../page-skeleton";

// The Ticket page's bento: the Status with its Workflow first, then the
// Customer, details, history and tracking link.
export default function Loading() {
  return (
    <PageSkeleton back>
      <div className="grid flex-1 gap-3 md:grid-cols-2 lg:gap-5 xl:grid-cols-4">
        <Panel className="flex flex-col gap-6 md:col-span-2 xl:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-4 w-52 max-w-full" />
            </div>
            <div className="hidden gap-3 sm:flex">
              <Skeleton className="h-12 w-44 rounded-full!" />
              <Skeleton className="h-12 w-40 rounded-full!" />
            </div>
          </div>
          <div className="flex justify-around gap-4 py-2">
            {[0, 1, 2].map((step) => (
              <div key={step} className="flex flex-col items-center gap-2.5">
                <Skeleton className="size-10 rounded-full!" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="flex flex-col gap-4">
          <Skeleton className="h-6 w-20" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-14 shrink-0 rounded-full!" />
            <Skeleton className="h-5 w-32 max-w-full" />
          </div>
          <Skeleton className="h-4 w-36" />
          <div className="mt-auto flex gap-2 pt-5">
            <Skeleton className="h-10 flex-1 rounded-full!" />
            <Skeleton className="h-10 flex-1 rounded-full!" />
          </div>
        </Panel>
        <Panel className="flex flex-col gap-5 xl:col-span-2">
          <Skeleton className="h-6 w-24" />
          <div className="grid grid-cols-2 gap-5">
            {[0, 1, 2, 3].map((field) => (
              <div key={field} className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-5 w-28 max-w-full" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="flex flex-col gap-4 md:min-h-72 xl:row-span-2">
          <Skeleton className="h-6 w-24" />
          {[0, 1, 2].map((event) => (
            <div key={event} className="flex flex-col gap-2">
              <Skeleton className="h-8 w-24 rounded-full!" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </Panel>
        <Panel className="flex flex-col gap-4 xl:row-span-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-12 rounded-full!" />
          <Skeleton className="h-16 rounded-2xl!" />
          <Skeleton className="h-16 rounded-2xl!" />
        </Panel>
        <Panel className="flex items-center justify-between gap-4 xl:col-span-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-10 w-36 rounded-full!" />
        </Panel>
      </div>
    </PageSkeleton>
  );
}
