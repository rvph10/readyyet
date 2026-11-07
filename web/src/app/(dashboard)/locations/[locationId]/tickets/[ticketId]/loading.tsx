import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../../page-skeleton";

// The Ticket page's two columns: the Status with its Workflow, details and
// photos, then the Customer, tracking link and history.
export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid flex-1 gap-3 md:grid-cols-2 lg:gap-5 xl:grid-cols-12">
        <div className="contents xl:col-span-8 xl:flex xl:flex-col xl:gap-5">
          <Panel className="flex flex-col gap-6 max-xl:order-1 md:max-xl:col-span-2">
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
          <Panel className="flex flex-col gap-3 max-xl:order-3">
            <Skeleton className="h-10 w-28" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-16 rounded-2xl!" />
              <Skeleton className="h-16 rounded-2xl!" />
              <Skeleton className="h-16 rounded-2xl! sm:col-span-2" />
            </div>
          </Panel>
          <Panel className="flex flex-col gap-4 max-xl:order-4 xl:flex-1">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="min-h-28 flex-1 rounded-2xl!" />
          </Panel>
        </div>
        <div className="contents xl:col-span-4 xl:flex xl:flex-col xl:gap-5">
          <Panel className="flex flex-col gap-4 max-xl:order-2">
            <div className="flex items-center gap-3">
              <Skeleton className="size-14 shrink-0 rounded-full!" />
              <Skeleton className="h-5 w-32 max-w-full" />
            </div>
            <Skeleton className="h-10 rounded-full!" />
          </Panel>
          <Panel className="flex flex-col gap-3 max-xl:order-5">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-12 rounded-full!" />
            <Skeleton className="h-16 rounded-2xl!" />
            <Skeleton className="h-16 rounded-2xl!" />
          </Panel>
          <Panel className="flex flex-col gap-4 max-xl:order-6 md:max-xl:col-span-2 xl:min-h-72 xl:flex-1">
            <Skeleton className="h-6 w-24" />
            {[0, 1, 2].map((event) => (
              <div key={event} className="flex items-center gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full!" />
                <Skeleton className="h-8 flex-1" />
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </PageSkeleton>
  );
}
