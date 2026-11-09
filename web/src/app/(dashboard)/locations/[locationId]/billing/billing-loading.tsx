import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

// ADR 0119: BillingBoard's bento while the plan loads, under the page's real
// header: the pine tile first, then the plans beside the smaller tiles.
export function BillingLoading() {
  return (
    <div aria-busy="true" className="grid flex-1 gap-3 md:grid-cols-2 lg:gap-5 xl:grid-cols-4">
      <div className="flex min-h-56 flex-col justify-between gap-6 rounded-sheet bg-pine p-6 md:col-span-2 lg:p-8 xl:col-span-3">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24 bg-surface/15!" />
          <Skeleton className="h-10 w-44 bg-surface/15!" />
          <Skeleton className="h-5 w-80 max-w-full bg-surface/15!" />
        </div>
        <Skeleton className="h-9 w-96 max-w-full rounded-full! bg-surface/15!" />
      </div>
      <Panel padding="lg" className="flex flex-col gap-3 md:col-span-2 xl:col-span-1">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-40 max-w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-auto h-10 rounded-full!" />
      </Panel>
      <Panel padding="lg" className="flex flex-col gap-5 md:col-span-2 xl:col-span-3 xl:row-span-2">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-12 w-60 max-w-full rounded-full!" />
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((plan) => (
            <div key={plan} className="flex min-h-72 flex-col gap-4 rounded-card border-2 border-border p-5">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="mt-auto h-11 rounded-full!" />
            </div>
          ))}
        </div>
      </Panel>
      {[0, 1].map((tile) => (
        <Panel key={tile} padding="lg" className="flex flex-col gap-3 md:col-span-2 xl:col-span-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-auto h-11 rounded-full!" />
        </Panel>
      ))}
    </div>
  );
}
