import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "../page-skeleton";

const SECTIONS = 5;
const GROUPS = 3;

// SettingsShell around ShopDetails, the section most links open on.
export default function Loading() {
  return (
    <div className="fit-screen flex flex-col">
      <PageSkeleton>
        <Panel padding="none" className="flex min-h-0 flex-1 flex-col overflow-clip lg:flex-row">
          <div className="flex shrink-0 gap-1 overflow-hidden border-b border-border p-3 lg:w-64 lg:flex-col lg:border-r lg:border-b-0 lg:p-4">
            {Array.from({ length: SECTIONS }, (_, section) => (
              <Skeleton key={section} className="h-11 w-28 shrink-0 rounded-xl! last:lg:mt-4 lg:w-full" />
            ))}
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-5 pt-6 lg:px-10 lg:pt-8">
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="mt-1 mb-6 h-6 w-96 max-w-full" />
            <div className="min-h-0 flex-1">
              {Array.from({ length: GROUPS }, (_, group) => (
                <div
                  key={group}
                  className="grid gap-4 border-t border-border py-6 first:border-t-0 first:pt-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10"
                >
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-32 max-w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="grid max-w-2xl grid-cols-6 gap-3">
                    <div className="col-span-6 flex flex-col gap-2 sm:col-span-4">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-12 w-full rounded-xl!" />
                    </div>
                    <div className="col-span-6 flex flex-col gap-2 sm:col-span-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-12 w-full rounded-xl!" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="-mx-5 flex justify-end gap-2 border-t border-border px-5 py-4 lg:-mx-10 lg:px-10">
              <Skeleton className="h-11 w-24 rounded-full!" />
              <Skeleton className="h-11 w-24 rounded-full!" />
            </div>
          </div>
        </Panel>
      </PageSkeleton>
    </div>
  );
}
