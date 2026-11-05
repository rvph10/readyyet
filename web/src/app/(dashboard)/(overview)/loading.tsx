import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy className="flex flex-col gap-6">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <Skeleton className="h-8 w-64 max-w-full" />
      <div>
        <Skeleton className="mb-3 h-6 w-40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["a", "b", "c"].map((key) => (
            <div key={key} className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-panel">
              <Skeleton className="size-10 shrink-0 rounded-xl!" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-28 max-w-full" />
                <Skeleton className="mt-2 h-6 w-16 rounded-full!" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
