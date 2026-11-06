import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 8;

export default function Loading() {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy className="flex flex-col gap-5">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <Skeleton className="h-12 w-48" />
      <Panel padding="none">
        <div className="p-5 lg:px-7 lg:pt-6">
          <Skeleton className="h-10 w-96 max-w-full rounded-full" />
        </div>
        {Array.from({ length: ROWS }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-t border-border px-5 py-4 lg:px-7">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-8 w-28 rounded-xl md:block" />
          </div>
        ))}
      </Panel>
    </div>
  );
}
