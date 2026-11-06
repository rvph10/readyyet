import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy className="flex flex-1 flex-col gap-4 lg:gap-5">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <div className="flex min-h-12 flex-col gap-2">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid flex-1 grid-rows-[auto_1fr] gap-4 lg:gap-5 xl:grid-cols-12">
        <Skeleton className="h-72 rounded-sheet! xl:col-span-7" />
        <div className="grid grid-cols-2 gap-4 lg:gap-5 xl:col-span-5">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-34 rounded-sheet!" />
          ))}
        </div>
        <Panel className="flex flex-col gap-4 xl:col-span-8">
          <Skeleton className="h-7 w-32" />
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-14 rounded-2xl!" />
          ))}
        </Panel>
        <Panel className="flex flex-col gap-4 xl:col-span-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-14 rounded-2xl!" />
        </Panel>
      </div>
    </div>
  );
}
