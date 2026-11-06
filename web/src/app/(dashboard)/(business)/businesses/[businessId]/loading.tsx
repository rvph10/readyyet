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
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
        {[0, 1, 2].map((tile) => (
          <Panel key={tile} className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl!" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-32 max-w-full" />
                <Skeleton className="h-6 w-20 rounded-full!" />
              </div>
              <Skeleton className="size-10 shrink-0 rounded-full!" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-20 rounded-2xl!" />
              <Skeleton className="h-20 rounded-2xl!" />
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
