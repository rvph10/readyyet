import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";

// Only the page's side: the navigation stays while a section loads.
export default function Loading() {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy className="flex flex-1 flex-col gap-5">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <Skeleton className="h-8 w-48" />
      <Panel className="flex-1">
        <Skeleton className="h-5 w-full max-w-md" />
        <Skeleton className="mt-4 h-5 w-full max-w-sm" />
        <Skeleton className="mt-4 h-5 w-full max-w-xs" />
      </Panel>
    </div>
  );
}
