import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

const TILES = 2;

// BusinessHero over the Location tiles, the last one being where to add a shop.
export default function Loading() {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy className="flex flex-1 flex-col gap-4 lg:gap-5">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <Panel padding="none" className="flex flex-col overflow-clip lg:flex-row">
        <Skeleton className="aspect-[3/1] w-full shrink-0 rounded-none! lg:h-44 lg:w-auto" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-3 p-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="size-14 shrink-0 rounded-2xl!" />
            <div className="flex min-w-0 flex-col gap-2">
              <Skeleton className="h-8 w-60 max-w-full" />
              <Skeleton className="h-4 w-44 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-11 w-36 rounded-full!" />
        </div>
      </Panel>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
        {Array.from({ length: TILES }, (_, tile) => (
          <Panel key={tile} padding="none" className="flex min-h-56 flex-col p-5 lg:p-6">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-8 w-40 max-w-full" />
              <Skeleton className="size-11 shrink-0 rounded-full!" />
            </div>
            <div className="mt-auto flex flex-col gap-3 pt-6">
              <Skeleton className="h-14 w-28" />
              <Skeleton className="h-3 w-full rounded-full!" />
              <Skeleton className="h-5 w-32" />
            </div>
          </Panel>
        ))}
        <div className="min-h-56 rounded-sheet border-2 border-dashed border-border-strong" />
      </div>
    </div>
  );
}
